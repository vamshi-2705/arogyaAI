import { askClaude } from '../lib/claude.js';
import { supabase } from '../lib/supabase.js';

const COMFORTER_BASE_PROMPT = `You are COMFORTER, the support AI for AROGYA WATCH AI in an Indian ER.
You help patient families waiting in the ER.

CRITICAL RULES:
- MAX 2 sentences per reply. Short and clear only.
- For emergencies: say "Please go to the nurse RIGHT NOW." — nothing else.
- For wait time: give a short honest estimate.
- Never diagnose. Never make promises.
- People here are panicked and stressed. BRIEF is KIND.`;

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

async function saveMessage(sessionId, role, content, agent = 'comforter') {
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    agent,
  });
  if (error) throw error;
}

/**
 * Handle a freeform question from the patient's family.
 * Injects triage context into system prompt.
 */
export async function handleComforterMessage(sessionId, userMessage, language = 'te') {
  // Fetch session context
  const { data: session } = await supabase
    .from('patient_sessions')
    .select('severity, queue_position, patient_name')
    .eq('id', sessionId)
    .single();

  const { data: triage } = await supabase
    .from('triage_data')
    .select('main_complaint, pain_level, duration_hours')
    .eq('session_id', sessionId)
    .single();

  const triageSummary = triage
    ? `Complaint: ${triage.main_complaint}, Pain: ${triage.pain_level}/10, Duration: ${triage.duration_hours}h`
    : 'Triage data not available';

  const langInstruction =
    language === 'hi'
      ? 'IMPORTANT: Respond ONLY in Hindi (हिंदी). Use Devanagari script.'
      : language === 'en'
      ? 'IMPORTANT: Respond ONLY in English.'
      : 'IMPORTANT: Respond ONLY in Telugu (తెలుగు). Use Telugu script.';

  const systemPrompt = `${COMFORTER_BASE_PROMPT}

Patient triage summary: ${triageSummary}
Current queue position: ${session?.queue_position || 'calculating...'}
Current severity level: ${session?.severity || 'pending'}
Patient name: ${session?.patient_name || 'Unknown'}

${langInstruction}`;

  const history = await getConversationHistory(sessionId, 10);

  await saveMessage(sessionId, 'user', userMessage, 'comforter');

  const reply = await askClaude(systemPrompt, userMessage, history);

  await saveMessage(sessionId, 'assistant', reply, 'comforter');

  return { reply };
}
