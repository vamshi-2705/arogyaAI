import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getDashboardData } from '../agents/commander.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * POST /api/nurse/login
 * Authenticate a nurse with email + password. Returns JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find nurse by email
    const { data: nurse, error } = await supabase
      .from('nurses')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !nurse) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, nurse.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: nurse.id,
        email: nurse.email,
        name: nurse.name,
        hospitalId: nurse.hospital_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      nurse: {
        id: nurse.id,
        name: nurse.name,
        email: nurse.email,
        hospitalId: nurse.hospital_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/dashboard
 * Get all waiting patients + unacknowledged alerts for the nurse's hospital.
 * Protected: requires JWT.
 */
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const hospitalId = req.nurse.hospitalId;
    const data = await getDashboardData(hospitalId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/alerts
 * Get all unacknowledged alerts for the hospital.
 */
router.get('/alerts', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('nurse_alerts')
      .select(`
        *,
        patient_sessions (patient_name, severity, queue_position)
      `)
      .eq('hospital_id', req.nurse.hospitalId)
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nurse/alerts/:id/ack
 * Acknowledge an alert.
 */
router.post('/alerts/:id/ack', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('nurse_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/patient/:id
 * Get a single patient's session info (for nurse chat view header).
 */
router.get('/patient/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    let resWithNotes = await supabase
      .from('patient_sessions')
      .select('id, patient_name, language, severity, severity_score, queue_position, status, created_at, last_check_in, nurse_notes')
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .maybeSingle();

    let data = resWithNotes.data;
    let error = resWithNotes.error;

    if (error && (error.message?.includes('nurse_notes') || error.code === '42703')) {
      const resFallback = await supabase
        .from('patient_sessions')
        .select('id, patient_name, language, severity, severity_score, queue_position, status, created_at, last_check_in')
        .eq('id', id)
        .eq('hospital_id', req.nurse.hospitalId)
        .maybeSingle();
      data = resFallback.data;
      error = resFallback.error;
    }

    if (error || !data) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient: data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/nurse/patient/:id/notes
 * Update nurse notes for a patient.
 */
router.put('/patient/:id/notes', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const { data, error } = await supabase
      .from('patient_sessions')
      .update({ nurse_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/patient/:id/messages
 * Get the full chat transcript for a patient session (read-only for nurse).
 */
router.get('/patient/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the patient belongs to this nurse's hospital
    const { data: session } = await supabase
      .from('patient_sessions')
      .select('id')
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .single();

    if (!session) return res.status(404).json({ error: 'Patient not found' });

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('role, content, agent, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: messages || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nurse/patient/:id/seen
 * Mark a patient as seen by the doctor.
 */
router.post('/patient/:id/seen', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('patient_sessions')
      .update({ status: 'seen', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/patients/seen
 * Get patients marked as seen (completed) for today.
 */
router.get('/patients/seen', authMiddleware, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('patient_sessions')
      .select(`
        id, patient_name, language, severity, severity_score,
        queue_position, status, created_at, updated_at, last_check_in,
        triage_data (main_complaint, pain_level, duration_hours)
      `)
      .eq('hospital_id', req.nurse.hospitalId)
      .eq('status', 'seen')
      .gte('updated_at', todayStart.toISOString())
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ patients: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/patients/history
 * Get all patients for today (waiting + seen + discharged).
 */
router.get('/patients/history', authMiddleware, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, days = 1 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const { data, error } = await supabase
      .from('patient_sessions')
      .select(`
        id, patient_name, language, severity, severity_score,
        queue_position, status, created_at, updated_at, last_check_in,
        triage_data (main_complaint, pain_level)
      `)
      .eq('hospital_id', req.nurse.hospitalId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json({ patients: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/stats
 * Dashboard summary stats for today.
 */
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('patient_sessions')
      .select('id, severity, status, created_at')
      .eq('hospital_id', req.nurse.hospitalId)
      .gte('created_at', todayStart.toISOString());

    if (error) throw error;

    const all = data || [];
    const stats = {
      totalToday: all.length,
      waiting: all.filter(p => p.status === 'waiting').length,
      seenToday: all.filter(p => p.status === 'seen').length,
      critical: all.filter(p => p.severity === 'critical').length,
      high: all.filter(p => p.severity === 'high').length,
      medium: all.filter(p => p.severity === 'medium').length,
      low: all.filter(p => p.severity === 'low').length,
      pending: all.filter(p => p.severity === 'pending').length,
    };
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nurse/register
 * Register a new nurse account (for the same hospital as the logged-in nurse).
 */
router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check email not already used
    const { data: existing } = await supabase
      .from('nurses')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) return res.status(409).json({ error: 'A nurse with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newNurse, error } = await supabase
      .from('nurses')
      .insert({
        hospital_id: req.nurse.hospitalId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
      })
      .select('id, name, email, hospital_id, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ nurse: newNurse });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nurse/patient/:id/call
 * One-tap nurse call-back: Inserts a paging message into chat_messages in patient's language
 */
router.post('/patient/:id/call', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get patient's session details (to know language & name)
    const { data: session, error: sError } = await supabase
      .from('patient_sessions')
      .select('language, hospital_id, patient_name')
      .eq('id', id)
      .eq('hospital_id', req.nurse.hospitalId)
      .single();

    if (sError || !session) return res.status(404).json({ error: 'Patient session not found' });

    const lang = session.language || 'en';
    const nurseName = req.nurse?.name || 'Priya';
    const patientName = session.patient_name || 'Patient';
    const messageContent =
      lang === 'hi'
        ? `📢 ${patientName}, कृपया तुरंत नर्स डेस्क पर आएं। नर्स ${nurseName} आपको बुला रही हैं।`
        : lang === 'en'
        ? `📢 ${patientName}, please come to the nurse's desk now. Nurse ${nurseName} is calling you.`
        : `📢 ${patientName}, దయచేసి ఇప్పుడే నర్సు డెస్క్‌కి రండి. నర్సు ${nurseName} మిమ్మల్ని పిలుస్తున్నారు.`;

    // Insert message into chat
    const { data, error: iError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: id,
        role: 'assistant',
        content: messageContent,
        agent: 'nurse_callback'
      })
      .select()
      .single();

    if (iError) throw iError;

    res.json({ success: true, message: data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/handover
 * Shift handover summary: Uses LLM (Groq) to compile a plain-text summary of all active waiting patients
 */
router.get('/handover', authMiddleware, async (req, res, next) => {
  try {
    const hospitalId = req.nurse.hospitalId;

    // Get all active waiting patients with their triage details
    let resWithNotes = await supabase
      .from('patient_sessions')
      .select(`
        id, patient_name, severity, severity_score, created_at, last_check_in, nurse_notes,
        triage_data (main_complaint, pain_level, previous_conditions)
      `)
      .eq('hospital_id', hospitalId)
      .eq('status', 'waiting')
      .order('severity_score', { ascending: false });

    let patients = resWithNotes.data;
    let pError = resWithNotes.error;

    if (pError && (pError.message?.includes('nurse_notes') || pError.code === '42703')) {
      const resFallback = await supabase
        .from('patient_sessions')
        .select(`
          id, patient_name, severity, severity_score, created_at, last_check_in,
          triage_data (main_complaint, pain_level, previous_conditions)
        `)
        .eq('hospital_id', hospitalId)
        .eq('status', 'waiting')
        .order('severity_score', { ascending: false });
      patients = resFallback.data;
      pError = resFallback.error;
    }

    if (pError) throw pError;

    if (!patients || patients.length === 0) {
      return res.json({ summary: 'No active patients currently waiting in the ER. Handover clean.' });
    }

    // Format patient list for the LLM
    const patientDetails = patients.map((p, idx) => {
      const td = p.triage_data?.[0] || p.triage_data || {};
      const waitMins = Math.floor((Date.now() - new Date(p.created_at)) / 60000);
      return `${idx + 1}. Patient: ${p.patient_name || 'Anonymous'}
   - Severity: ${p.severity.toUpperCase()} (Score: ${p.severity_score}/100)
   - Wait Time: ${waitMins} mins
   - Complaint: ${td.main_complaint || 'N/A'}
   - Pain Level: ${td.pain_level || 'N/A'}/10
   - History: ${td.previous_conditions || 'N/A'}
   - Clinical Nurse Notes: ${p.nurse_notes || 'None recorded'}`;
    }).join('\n\n');

    // Call Groq to generate a professional, concise, clinical handover report
    const systemPrompt = `You are a Chief ER Medical Officer compiling a professional Shift Handover Summary.
Summarize the current ER waiting room status clearly for the incoming nurse shift.
Include any key clinical observations from the "Clinical Nurse Notes" in the summary.
Format it in clean clinical plain text with clear sections:
1. Executive Summary (Total patients waiting, breakdown by severity)
2. High Priority Cases (Critical/High severity patients that need immediate focus, incorporating nurse notes observations)
3. General Waiting Room Queue (Brief details of others, highlight long wait times)
Keep the tone clinical, professional, and dense with vital medical context. Do not use markdown style headers like '#', use plain capital letters.`;

    const userMessage = `Please generate the handover report based on these current ER patients:\n\n${patientDetails}`;

    const { askClaude } = await import('../lib/claude.js');
    const summary = await askClaude(systemPrompt, userMessage);

    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nurse/translate
 * Translate patient complaint details to target language (te/hi) using Llama AI on demand.
 */
router.post('/translate', authMiddleware, async (req, res, next) => {
  try {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'Text to translate is required' });

    const langName = targetLang === 'hi' ? 'Hindi' : 'Telugu';
    const systemPrompt = `You are a professional medical translator at an Indian government hospital ER. 
Translate the provided patient complaint details text to standard ${langName}. 
Provide ONLY the translated text. Do not add any conversational remarks or notes. Keep it clinically accurate.`;

    const { askClaude } = await import('../lib/claude.js');
    const translatedText = await askClaude(systemPrompt, text);

    res.json({ translatedText: translatedText.trim() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nurse/team
 * List all nurses in the same hospital.
 */
router.get('/team', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('nurses')
      .select('id, name, email, created_at')
      .eq('hospital_id', req.nurse.hospitalId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ nurses: data || [] });
  } catch (err) {
    next(err);
  }
});

export default router;


