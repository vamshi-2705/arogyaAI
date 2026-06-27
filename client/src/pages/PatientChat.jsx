import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatWindow from '../components/patient/ChatWindow';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { usePatientSession } from '../hooks/usePatientSession';
import api from '../lib/api';

/**
 * Main patient chat page — /patient/:sessionId
 */
export default function PatientChat() {
  const { sessionId } = useParams();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { messages, session, loading, error, addMessage, setMessages } = usePatientSession(sessionId);
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState(location.state?.language || 'te');

  // If a greeting was passed via navigation state, add it
  const greetingInjected = useRef(false);
  useEffect(() => {
    if (location.state?.greeting && !greetingInjected.current && messages.length === 0) {
      // Messages will be loaded from DB via usePatientSession
      greetingInjected.current = true;
    }
  }, [location.state, messages.length]);

  // Set i18n language when session loads
  useEffect(() => {
    if (session?.language) {
      setLanguage(session.language);
      i18n.changeLanguage(session.language);
    }
  }, [session?.language]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleSendMessage = async (messageText, isWatcherResponse = false) => {
    if (!messageText.trim() || sending) return;

    setSending(true);

    // Optimistically add user message to UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    addMessage(tempUserMsg);

    try {
      const res = await api.post('/api/patient/message', {
        sessionId,
        message: messageText,
        isWatcherResponse,
      });

      const tempAiMsg = {
        id: `temp-ai-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        created_at: new Date().toISOString(),
      };
      addMessage(tempAiMsg);

      // If triage just completed, update session state to reflect new severity
      if (res.data.triageComplete || res.data.escalated) {
        // Refresh full message list from DB to get clean IDs
        const chatRes = await api.get(`/api/patient/session/${sessionId}/chat`);
        setMessages(chatRes.data || []);
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          language === 'hi'
            ? 'सर्वर समस्या। कृपया सीधे नर्स को बताएं।'
            : 'సర్వర్ సమస్య. దయచేసి నర్సుకు నేరుగా చెప్పండి.',
        created_at: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner size="large" />
        <p>{t('connecting')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{t('errorServer')}</p>
      </div>
    );
  }

  return (
    <div className="patient-chat-page">
      <ChatWindow
        messages={messages}
        sessionId={sessionId}
        language={language}
        onLanguageChange={handleLanguageChange}
        onSendMessage={handleSendMessage}
        sending={sending}
        session={session}
      />
    </div>
  );
}
