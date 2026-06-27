import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend } from 'react-icons/fi';
import { MdLocalHospital } from 'react-icons/md';
import MessageBubble from './MessageBubble';
import LanguageSelector from './LanguageSelector';

const WATCHER_KEYWORDS = [
  'ఎలా ఉన్నారు', 'మెరుగుపడ్డారా', 'తీవ్రమయ్యారు',  // Telugu
  'कैसे हैं', 'बेहतर', 'बिगड़',                      // Hindi
  'how is the patient', 'better', 'worse', 'same',   // English
  'check-in', 'condition',
];

function isWatcherMessage(content) {
  return WATCHER_KEYWORDS.some((kw) => content.toLowerCase().includes(kw.toLowerCase()));
}

/**
 * WhatsApp-style chat window for patient/family.
 */
export default function ChatWindow({
  messages,
  sessionId,
  language,
  onLanguageChange,
  onSendMessage,
  sending,
  session,
}) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Keep cursor active in typing box after sending is complete
  useEffect(() => {
    if (!sending) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [sending]);

  const lastMessage = messages[messages.length - 1];
  const showQuickReplies =
    lastMessage?.role === 'assistant' && isWatcherMessage(lastMessage.content);

  const handleSend = (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    onSendMessage(msg, showQuickReplies);
    
    // Focus back on the input field
    setTimeout(() => {
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies =
    language === 'hi'
      ? [
          { label: '✅ बेहतर है', value: 'बेहतर है' },
          { label: '➡️ वैसा ही है', value: 'वैसा ही है' },
          { label: '⚠️ बिगड़ गया', value: 'बिगड़ गया', danger: true },
        ]
      : language === 'en'
      ? [
          { label: '✅ Better', value: 'Better' },
          { label: '➡️ Same as before', value: 'Same as before' },
          { label: '⚠️ Getting worse', value: 'Getting worse', danger: true },
        ]
      : [
          { label: '✅ మెరుగుపడ్డారు', value: 'మెరుగుపడ్డారు' },
          { label: '➡️ అదే విధంగా ఉన్నారు', value: 'అదే విధంగా ఉన్నారు' },
          { label: '⚠️ తీవ్రమయ్యారు', value: 'తీవ్రమయ్యారు', danger: true },
        ];

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-avatar">
            <MdLocalHospital size={22} />
          </div>
          <div>
            <div className="chat-header-title">AROGYA WATCH AI</div>
            <div className="chat-header-sub">
              {session?.severity && session.severity !== 'pending' ? (
                <span className={`severity-badge severity-badge--${session.severity}`}>
                  {session.severity.toUpperCase()} · #{session.queue_position}
                </span>
              ) : (
                <span className="chat-header-online">● {language === 'hi' ? 'ऑनलाइन' : 'ఆన్‌లైన్'}</span>
              )}
            </div>
          </div>
        </div>
        <LanguageSelector
          sessionId={sessionId}
          currentLanguage={language}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-container">
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} message={msg} />
        ))}

        {sending && (
          <div className="msg-row msg-row--ai">
            <div className="bubble bubble--ai">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Buttons (WATCHER check-in) */}
      {showQuickReplies && !sending && (
        <div className="quick-replies">
          {quickReplies.map((qr) => (
            <button
              key={qr.value}
              className={`qr-btn ${qr.danger ? 'qr-btn--danger' : ''}`}
              onClick={() => handleSend(qr.value)}
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder={t('typeMessage')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          className="send-btn"
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          aria-label={t('send')}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
}
