import { askClaude } from '../lib/claude.js';
import { supabase } from '../lib/supabase.js';
import { updateQueue, fireNurseAlert } from './commander.js';

const COMFORTER_BASE_PROMPT = `You are COMFORTER, the support AI for AROGYA WATCH AI in an Indian ER.
You help patient families waiting in the ER.

CRITICAL RULES:
- MAX 2 sentences per reply. Short and clear only.
- For emergencies: say "Please go to the nurse RIGHT NOW." — nothing else.
- For wait time: give a short honest estimate.
- Never diagnose. Never make promises.
- People here are panicked and stressed. BRIEF is KIND.`;

const WATCHER_SYSTEM_PROMPT = `You are WATCHER, the monitoring AI for AROGYA WATCH AI.
You send a quick 15-minute check-in to the patient's family.

CRITICAL RULES:
- MAX 1-2 sentences per reply. No long messages.
- Ask only: is the patient Better, Same, or Worse?
- If WORSE: reply in 1 sentence, then output: {"escalate": true, "new_severity": "critical"}
- If SAME or BETTER: reply in 1 sentence, then output: {"escalate": false}
- BRIEF is KIND. People here are in emergency.`;

function extractWatcherJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*"escalate"\s*:\s*(true|false)[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    console.error('[WATCHER] Failed to parse JSON:', e.message);
  }
  return null;
}

async function getConversationHistory(sessionId, limit = 10) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function saveMessage(sessionId, role, content, agent = 'watcher') {
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    agent,
  });
  if (error) throw error;
}

/**
 * Generate a 15-minute check-in message for a session.
 * Appends to chat history as an assistant message.
 */
export async function sendWatcherCheckin(sessionId, language = 'te') {
  const message =
    language === 'hi'
      ? 'मरीज़ अभी कैसे हैं? बेहतर हैं, वैसे ही हैं, या हालत बिगड़ी है?'
      : language === 'en'
      ? 'Hi! How is the patient doing right now? Are they Better, Same as before, or Getting worse?'
      : 'మీ రోగి ఇప్పుడు ఎలా ఉన్నారు? మెరుగుపడ్డారా, అదే విధంగా ఉన్నారా, లేదా తీవ్రమయ్యారు?';

  await saveMessage(sessionId, 'assistant', message, 'watcher');

  // Update last_check_in timestamp
  await supabase
    .from('patient_sessions')
    .update({ last_check_in: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Handle a patient's response to a WATCHER check-in.
 */
export async function handleWatcherResponse(sessionId, userMessage, language = 'te') {
  const langInstruction =
    language === 'hi'
      ? 'IMPORTANT: Respond ONLY in Hindi (हिंदी).'
      : language === 'en'
      ? 'IMPORTANT: Respond ONLY in English.'
      : 'IMPORTANT: Respond ONLY in Telugu (తెలుగు).';

  const systemPrompt = `${WATCHER_SYSTEM_PROMPT}\n\n${langInstruction}`;
  const history = await getConversationHistory(sessionId, 10);

  await saveMessage(sessionId, 'user', userMessage, 'watcher');

  const reply = await askClaude(systemPrompt, userMessage, history);
  await saveMessage(sessionId, 'assistant', reply, 'watcher');

  const watcherData = extractWatcherJSON(reply);

  // Get current session info
  const { data: session } = await supabase
    .from('patient_sessions')
    .select('severity, hospital_id, patient_name')
    .eq('id', sessionId)
    .single();

  const previousSeverity = session?.severity || 'medium';
  const escalated = watcherData?.escalate === true;
  const newSeverity = escalated ? (watcherData.new_severity || 'critical') : previousSeverity;

  // Determine reported_status from user message
  const lowerMsg = userMessage.toLowerCase();
  let reportedStatus = 'same';
  if (lowerMsg.includes('worse') || lowerMsg.includes('తీవ్రమ') || lowerMsg.includes('बिगड़')) {
    reportedStatus = 'worse';
  } else if (lowerMsg.includes('better') || lowerMsg.includes('మెరుగు') || lowerMsg.includes('बेहतर')) {
    reportedStatus = 'better';
  }

  // Log condition check
  await supabase.from('condition_checks').insert({
    session_id: sessionId,
    reported_status: reportedStatus,
    previous_severity: previousSeverity,
    new_severity: newSeverity,
    escalated,
    nurse_alerted: escalated,
  });

  if (escalated && session?.hospital_id) {
    // Update severity to critical
    await supabase
      .from('patient_sessions')
      .update({
        severity: newSeverity,
        severity_score: 90,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Recalculate queue
    await updateQueue(session.hospital_id);

    // Fire nurse alert
    await fireNurseAlert(
      sessionId,
      'critical',
      `Patient condition WORSENED: ${session.patient_name || 'Unknown'}. Previous: ${previousSeverity} → Now: CRITICAL`,
      session.hospital_id
    );
  }

  // Update last_check_in
  await supabase
    .from('patient_sessions')
    .update({ last_check_in: new Date().toISOString() })
    .eq('id', sessionId);

  return { reply, escalated };
}

/**
 * Run WATCHER check-ins for all waiting patients.
 * Called by cron job every 15 minutes.
 */
export async function runWatcherCheckins() {
  const fourteenMinutesAgo = new Date(Date.now() - 14 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from('patient_sessions')
    .select('id, language, last_check_in')
    .eq('status', 'waiting')
    .eq('triage_complete', true)
    .lt('last_check_in', fourteenMinutesAgo);

  if (error) {
    console.error('[WATCHER CRON] Error fetching sessions:', error);
    return;
  }

  console.log(`[WATCHER CRON] Sending check-ins to ${sessions?.length || 0} patients`);

  for (const session of sessions || []) {
    try {
      await sendWatcherCheckin(session.id, session.language);
    } catch (err) {
      console.error(`[WATCHER CRON] Failed for session ${session.id}:`, err.message);
    }
  }
}
