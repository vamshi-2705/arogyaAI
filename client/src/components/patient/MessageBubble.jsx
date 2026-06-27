import { useTranslation } from 'react-i18next';

/**
 * Individual chat message bubble — WhatsApp style.
 * role: 'user' (right, green) | 'assistant' (left, white)
 */
export default function MessageBubble({ message }) {
  const { role, content, created_at } = message;
  const isUser = role === 'user';

  const timeStr = created_at
    ? new Date(created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  // Strip JSON blocks from display (they are internal agent data)
  const displayContent = content
    .replace(/\{[\s\S]*?"triage_complete"\s*:\s*true[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"escalate"\s*:\s*(true|false)[\s\S]*?\}/g, '')
    .trim();

  if (!displayContent) return null;

  return (
    <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}>
      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--ai'}`}>
        <p className="bubble-text">{displayContent}</p>
        <span className="bubble-time">{timeStr}</span>
      </div>
    </div>
  );
}
