import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';

const SEVERITY_COLOR = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
  pending: '#94A3B8',
};

/**
 * Read-only chat transcript for nurses.
 * Accessed via /nurse/chat/:sessionId
 */
export default function NurseChatView() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('nurse_token');
        const [msgsRes, sessRes] = await Promise.all([
          api.get(`/api/nurse/patient/${sessionId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get(`/api/nurse/patient/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setMessages(msgsRes.data.messages || []);
        setSession(sessRes.data.patient || null);
      } catch (e) {
        setError('Could not load chat. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="nurse-chat-view nurse-chat-view--loading">
        <div className="spinner" />
        <p>Loading chat…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nurse-chat-view nurse-chat-view--error">
        <p>{error}</p>
        <button onClick={() => window.close()}>Close</button>
      </div>
    );
  }

  const sevColor = SEVERITY_COLOR[session?.severity] || SEVERITY_COLOR.pending;

  return (
    <div className="nurse-chat-view">
      {/* Header */}
      <div className="ncv-header">
        <div className="ncv-header-left">
          <button className="ncv-back-btn" onClick={() => window.close()}>
            ✕ Close
          </button>
          <div className="ncv-patient-info">
            <span className="ncv-patient-name">
              👤 {session?.patient_name || 'Unknown Patient'}
            </span>
            <span className="ncv-lang">
              {session?.language === 'hi' ? 'Hindi' : session?.language === 'en' ? 'English' : 'Telugu'}
            </span>
          </div>
        </div>
        <div className="ncv-severity" style={{ color: sevColor }}>
          ● {(session?.severity || 'PENDING').toUpperCase()}
          &nbsp;&nbsp;
          <span className="ncv-queue">#{session?.queue_position || '–'} in queue</span>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="ncv-readonly-badge">
        🔒 Read-only — Nurse view. You cannot send messages here.
      </div>

      {/* Chat messages */}
      <div className="ncv-messages">
        {messages.length === 0 ? (
          <p className="ncv-empty">No messages yet.</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`ncv-msg ncv-msg--${msg.role}`}
            >
              <div className="ncv-msg-label">
                {msg.role === 'assistant'
                  ? `🤖 AI (${msg.agent || 'system'})`
                  : '👤 Patient/Family'}
              </div>
              <div className="ncv-msg-bubble">
                {msg.content}
              </div>
              {msg.created_at && (
                <div className="ncv-msg-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
