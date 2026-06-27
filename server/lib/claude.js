import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model: llama-3.3-70b — fast, multilingual, handles Telugu & Hindi well
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Call Groq LLM with a system prompt, user message, and optional conversation history.
 * Drop-in replacement for the Anthropic askClaude function — same signature.
 * @param {string} systemPrompt - The agent's system instructions
 * @param {string} userMessage - The latest user message
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @returns {Promise<string>} - Model response text
 */
export async function askClaude(systemPrompt, userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
  });

  return response.choices[0].message.content;
}
