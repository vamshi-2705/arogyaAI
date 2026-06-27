import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { generateGreeting, handleGreeterMessage } from '../agents/greeter.js';
import { handleWatcherResponse, sendWatcherCheckin } from '../agents/watcher.js';
import { handleComforterMessage } from '../agents/comforter.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const HOSPITAL_ID = process.env.HOSPITAL_ID;

/**
 * POST /api/patient/session
 * Create a new anonymous patient session on QR scan.
 */
router.post('/session', async (req, res, next) => {
  try {
    const { hospitalId = HOSPITAL_ID, language = 'te' } = req.body;

    const { data: session, error } = await supabase
      .from('patient_sessions')
      .insert({
        hospital_id: hospitalId,
        language,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;

    // Generate and save initial GREETER greeting
    const greeting = await generateGreeting(session.id, language);

    res.status(201).json({ session, greeting });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patient/session/:id
 * Get session details.
 */
router.get('/session/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('patient_sessions')
      .select(`
        *, 
        triage_data (*),
        chat_messages (id, role, content, agent, created_at)
      `)
      .eq('id', id)
      .order('created_at', { foreignTable: 'chat_messages', ascending: true })
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Session not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patient/session/:id/chat
 * Get chat messages for a session.
 */
router.get('/session/:id/chat', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/patient/session/:id
 * Update session (e.g., language, patient_name).
 */
router.patch('/session/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, patient_name } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (language) updates.language = language;
    if (patient_name) updates.patient_name = patient_name;

    const { data, error } = await supabase
      .from('patient_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patient/message
 * Send a message — server routes to appropriate agent based on session state.
 * Body: { sessionId, message, isWatcherResponse? }
 */
router.post('/message', async (req, res, next) => {
  try {
    const { sessionId, message, isWatcherResponse = false } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Get session state
    const { data: session, error: sessionError } = await supabase
      .from('patient_sessions')
      .select('triage_complete, language, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'waiting') {
      return res.status(400).json({ error: 'Session is no longer active' });
    }

    let result;

    // Route to appropriate agent
    if (!session.triage_complete) {
      // GREETER — triage not done yet
      result = await handleGreeterMessage(sessionId, message, session.language);
    } else if (isWatcherResponse) {
      // WATCHER — patient responding to 15-min check-in
      result = await handleWatcherResponse(sessionId, message, session.language);
    } else {
      // COMFORTER — freeform question after triage
      result = await handleComforterMessage(sessionId, message, session.language);
    }

    res.json({
      reply: result.reply,
      triageComplete: result.triageComplete || false,
      escalated: result.escalated || false,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
