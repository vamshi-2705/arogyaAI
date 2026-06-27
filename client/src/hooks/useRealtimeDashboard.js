import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Subscribes to Supabase Realtime for live nurse dashboard updates.
 * Returns { patients, alerts, loading, refetch }.
 */
export function useRealtimeDashboard(hospitalId, fetchDashboard) {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const refetch = async () => {
    try {
      const data = await fetchDashboard();
      setPatients(data.patients || []);
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('[Realtime] Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hospitalId) return;

    // Initial fetch
    refetch();

    // Fallback polling: Fetch updates every 5 seconds to guarantee realtime sync
    const pollInterval = setInterval(() => {
      refetch();
    }, 5000);

    // Subscribe to patient_sessions changes
    const channel = supabase
      .channel(`dashboard-${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_sessions',
          filter: `hospital_id=eq.${hospitalId}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nurse_alerts',
          filter: `hospital_id=eq.${hospitalId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev]);
          refetch(); // Also refresh the full list
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
  }, [hospitalId]);

  return { patients, alerts, loading, refetch, setAlerts };
}
