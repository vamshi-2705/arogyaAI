import { askClaude } from '../lib/claude.js';
import { supabase } from '../lib/supabase.js';
import { updateQueue, fireNurseAlert } from './commander.js';

const GREETER_SYSTEM_PROMPT = `You are GREETER, the triage AI for AROGYA WATCH AI in an Indian ER.
Conduct a 5-question triage with the patient's family. ASK ONE QUESTION AT A TIME.

CRITICAL RULES:
- Keep EVERY response under 2 sentences. No long explanations.
- Ask ONE question at a time. Short. Simple words only.
- Never use medical jargon.
- Be warm but BRIEF. People here are stressed and in emergency.

The 5 questions (ask one per message):
1. What is the main problem? (main complaint)
2. Pain from 1 to 10?
3. How long? (hours or days)
4. Any past illness? (diabetes, BP, heart, etc.)
5. Any medicines now?

After all 5 answers are collected, output ONLY this JSON (nothing else after it):
{"triage_complete": true, "severity": "high", "severity_score": 72, "summary": "brief English summary for nurse", "main_complaint": "text", "pain_level": 7, "duration_hours": 24, "previous_conditions": "text or none", "current_medications": "text or none"}

Severity rules: LOW=1-30, MEDIUM=31-60, HIGH=61-85, CRITICAL=86-100`;

/**
 * Extract JSON triage data from Claude's response text.
 */
function extractTriageJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*"triage_complete"\s*:\s*true[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    console.error('[GREETER] Failed to parse triage JSON:', e.message);
  }
  return null;
}

/**
 * Get last N messages for a session to use as conversation history.
 */
async function getConversationHistory(sessionId, limit = 10) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).reverse();
}

/**
 * Save a message to the chat_messages table.
 */
async function saveMessage(sessionId, role, content, agent = 'greeter') {
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    agent,
  });
  if (error) throw error;
}

/**
 * Main GREETER handler — processes a user message during triage.
 * @param {string} sessionId
 * @param {string} userMessage
 * @param {string} language - 'te' | 'hi'
 * @returns {Promise<{reply: string, triageComplete: boolean}>}
 */
export async function handleGreeterMessage(sessionId, userMessage, language = 'te') {
  // Build language-specific system prompt
  const langInstruction =
    language === 'hi'
      ? 'IMPORTANT: Respond ONLY in Hindi (\u0939\u093f\u0902\u0926\u0940). Use Devanagari script.'
      : language === 'en'
      ? 'IMPORTANT: Respond ONLY in English.'
      : 'IMPORTANT: Respond ONLY in Telugu (\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41). Use Telugu script.';

  const systemPrompt = `${GREETER_SYSTEM_PROMPT}\n\n${langInstruction}`;

  // Get conversation history
  const history = await getConversationHistory(sessionId, 10);

  // Save user message
  await saveMessage(sessionId, 'user', userMessage, 'greeter');

  // Call Claude
  const reply = await askClaude(systemPrompt, userMessage, history);

  // Save assistant reply
  await saveMessage(sessionId, 'assistant', reply, 'greeter');

  // Check if triage is complete
  const triageData = extractTriageJSON(reply);

  if (triageData && triageData.triage_complete) {
    // Update patient session with severity
    const { error: sessionError } = await supabase
      .from('patient_sessions')
      .update({
        severity: triageData.severity,
        severity_score: triageData.severity_score,
        triage_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (sessionError) console.error('[GREETER] Failed to update session:', sessionError);

    // Get the session's hospital_id
    const { data: session } = await supabase
      .from('patient_sessions')
      .select('hospital_id, patient_name')
      .eq('id', sessionId)
      .single();

    // Save triage data
    const { error: triageError } = await supabase.from('triage_data').insert({
      session_id: sessionId,
      main_complaint: triageData.main_complaint,
      pain_level: triageData.pain_level,
      duration_hours: triageData.duration_hours,
      previous_conditions: triageData.previous_conditions,
      current_medications: triageData.current_medications,
      raw_responses: triageData,
    });

    if (triageError) console.error('[GREETER] Failed to save triage data:', triageError);

    // Update queue positions
    if (session?.hospital_id) {
      await updateQueue(session.hospital_id);

      // Alert nurse if high or critical
      if (['high', 'critical'].includes(triageData.severity)) {
        await fireNurseAlert(
          sessionId,
          triageData.severity === 'critical' ? 'critical' : 'escalation',
          `New ${triageData.severity.toUpperCase()} patient: ${triageData.summary}`,
          session.hospital_id
        );
      }
    }

    return { reply, triageComplete: true };
  }

  return { reply, triageComplete: false };
}

/**
 * Generate the initial greeting message for a new session.
 */
export async function generateGreeting(sessionId, language = 'te') {
  const greeting =
    language === 'hi'
      ? 'नमस्ते! AROGYA WATCH AI में आपका स्वागत है। मैं मरीज़ की स्थिति समझने के लिए कुछ सवाल पूछूंगा।\n\nसबसे पहले बताइए — मरीज़ की मुख्य समस्या क्या है आज?'
      : language === 'en'
      ? 'Hello! Welcome to AROGYA WATCH AI. I will ask you a few questions to understand the patient\'s condition.\n\nFirst, please tell me — what is the patient\'s main problem today?'
      : 'నమస్కారం! AROGYA WATCH AI కి స్వాగతం. మీ రోగి యొక్క వివరాలు తెలుసుకోవడానికి కొన్ని ప్రశ్నలు అడుగుతాను.\n\nముందుగా చెప్పండి — రోగికి ఇప్పుడు ప్రధాన సమస్య ఏమిటి?';

  await saveMessage(sessionId, 'assistant', greeting, 'greeter');
  return greeting;
}
