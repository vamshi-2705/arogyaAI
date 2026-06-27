import { supabase } from '../lib/supabase.js';

/**
 * COMMANDER agent — orchestration logic for queue management and nurse alerts.
 * No LLM calls — pure database orchestration.
 */

/**
 * Recalculate queue positions for all waiting patients in a hospital.
 * Sorted by severity_score DESC, then created_at ASC (first come, first served for equal severity).
 */
export async function updateQueue(hospitalId) {
  try {
    const { data: sessions, error } = await supabase
      .from('patient_sessions')
      .select('id, severity_score, created_at')
      .eq('hospital_id', hospitalId)
      .eq('status', 'waiting')
      .order('severity_score', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Reassign queue positions 1, 2, 3...
    const updates = (sessions || []).map((session, index) => ({
      id: session.id,
      queue_position: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      await supabase
        .from('patient_sessions')
        .update({ queue_position: update.queue_position, updated_at: update.updated_at })
        .eq('id', update.id);
    }

    console.log(`[COMMANDER] Updated queue for hospital ${hospitalId}: ${updates.length} patients`);
  } catch (err) {
    console.error('[COMMANDER] updateQueue error:', err.message);
  }
}

/**
 * Fire a nurse alert (inserts into nurse_alerts table).
 * Supabase Realtime will push this to the nurse dashboard automatically.
 */
export async function fireNurseAlert(sessionId, alertType, message, hospitalId) {
  try {
    const { error } = await supabase.from('nurse_alerts').insert({
      session_id: sessionId,
      hospital_id: hospitalId,
      alert_type: alertType,
      message,
    });

    if (error) throw error;

    console.log(`[COMMANDER] Alert fired: ${alertType} for session ${sessionId}`);
  } catch (err) {
    console.error('[COMMANDER] fireNurseAlert error:', err.message);
  }
}

/**
 * Check for patients who haven't responded in 30+ minutes.
 * Fires 'no_response' alerts for them.
 * Called every 30 minutes by cron.
 */
export async function checkNoResponse(hospitalId) {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: sessions, error } = await supabase
      .from('patient_sessions')
      .select('id, patient_name, queue_position, hospital_id')
      .eq('status', 'waiting')
      .eq('triage_complete', true)
      .lt('last_check_in', thirtyMinutesAgo)
      .eq(hospitalId ? 'hospital_id' : 'status', hospitalId || 'waiting');

    if (error) throw error;

    for (const session of sessions || []) {
      await fireNurseAlert(
        session.id,
        'no_response',
        `No response from patient "${session.patient_name || 'Unknown'}" (Queue #${session.queue_position}) for 30+ minutes`,
        session.hospital_id
      );
    }

    if (sessions?.length) {
      console.log(`[COMMANDER] No-response alerts fired for ${sessions.length} patients`);
    }
  } catch (err) {
    console.error('[COMMANDER] checkNoResponse error:', err.message);
  }
}

/**
 * Get full dashboard data for a hospital — sorted by severity.
 */
export async function getDashboardData(hospitalId) {
  let patients = [];
  let pError = null;

  // Try querying with nurse_notes first
  const resWithNotes = await supabase
    .from('patient_sessions')
    .select(`
      id, patient_name, severity, severity_score, queue_position,
      status, last_check_in, created_at, language, nurse_notes,
      triage_data (main_complaint, pain_level, duration_hours)
    `)
    .eq('hospital_id', hospitalId)
    .eq('status', 'waiting')
    .order('severity_score', { ascending: false })
    .order('created_at', { ascending: true });

  if (resWithNotes.error) {
    pError = resWithNotes.error;
    // Fallback: If nurse_notes column is missing, query without it
    if (pError.message?.includes('nurse_notes') || pError.code === '42703') {
      console.warn('[Commander] Fallback: nurse_notes column missing. Querying without nurse_notes...');
      const resFallback = await supabase
        .from('patient_sessions')
        .select(`
          id, patient_name, severity, severity_score, queue_position,
          status, last_check_in, created_at, language,
          triage_data (main_complaint, pain_level, duration_hours)
        `)
        .eq('hospital_id', hospitalId)
        .eq('status', 'waiting')
        .order('severity_score', { ascending: false })
        .order('created_at', { ascending: true });

      if (resFallback.error) throw resFallback.error;
      patients = resFallback.data || [];
    } else {
      throw pError;
    }
  } else {
    patients = resWithNotes.data || [];
  }

  // Enhance patients with trend data and call-back logs
  const enrichedPatients = await Promise.all((patients || []).map(async (p) => {
    // Get last callback
    const { data: cbMsg } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('session_id', p.id)
      .eq('agent', 'nurse_callback')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get condition checks history
    const { data: checks } = await supabase
      .from('condition_checks')
      .select('new_severity, created_at')
      .eq('session_id', p.id)
      .order('created_at', { ascending: true });

    // Map severities to scores for plotting
    const sevScores = { pending: 0, low: 15, medium: 45, high: 75, critical: 95 };
    const trend = [
      { date: p.created_at, score: p.severity_score || sevScores[p.severity] || 0 }
    ];

    if (checks) {
      checks.forEach(c => {
        trend.push({
          date: c.created_at,
          score: sevScores[c.new_severity] || 30
        });
      });
    }

    return {
      ...p,
      called_at: cbMsg ? cbMsg.created_at : null,
      trend
    };
  }));

  const { data: alerts, error: aError } = await supabase
    .from('nurse_alerts')
    .select('*')
    .eq('hospital_id', hospitalId)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false });

  if (aError) throw aError;

  return { patients: enrichedPatients, alerts: alerts || [] };
}
