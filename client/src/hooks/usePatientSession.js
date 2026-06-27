import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

/**
 * Fetches and manages patient session state.
 * Subscribes to Supabase Realtime for live message updates.
 */
export function usePatientSession(sessionId) {
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/api/patient/session/${sessionId}/chat`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('[usePatientSession] Failed to fetch messages:', err);
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/api/patient/session/${sessionId}`);
      setSession(res.data);
    } catch (err) {
      setError('Session not found');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    fetchMessages();
  }, [fetchSession, fetchMessages]);

  // Set up Supabase Realtime subscription for this patient session
  useEffect(() => {
    if (!sessionId) return;

    // Fallback polling: Fetch updates every 3 seconds to guarantee instant message delivery
    const pollInterval = setInterval(() => {
      fetchMessages();
      fetchSession();
    }, 3000);

    const channel = supabase
      .channel(`session-chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Fetch the full clean message list from DB
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          fetchSession();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, fetchMessages, fetchSession]);

  const addMessage = (msg) => {
    // Deduplicate temp messages: only add if not already in state
    setMessages((prev) => {
      if (prev.some(m => m.content === msg.content && m.role === msg.role && m.id === msg.id)) {
        return prev;
      }
      return [...prev, msg];
    });
  };

  return { messages, session, loading, error, fetchMessages, fetchSession, addMessage, setMessages };
}
