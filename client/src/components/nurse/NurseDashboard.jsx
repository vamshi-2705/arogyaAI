import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard';
import AlertBanner from './AlertBanner';
import QueueList from './QueueList';
import Sidebar from './Sidebar';
import DetailPanel from './DetailPanel';
import api from '../../lib/api';

import { 
  MdLocalHospital, 
  MdRefresh, 
  MdPersonAdd, 
  MdClose, 
  MdSearch, 
  MdGroup, 
  MdDarkMode, 
  MdOutlineDarkMode, 
  MdDescription, 
  MdQrCode 
} from 'react-icons/md';

const TABS = [
  { id: 'waiting',   label: 'Waiting' },
  { id: 'seen',      label: 'Seen today' },
  { id: 'history',   label: 'Shift log' },
  { id: 'team',      label: 'Manage staff' }
];

const SEV_COLOR = {
  critical: '#D93025', 
  high: '#D97706',
  medium: '#1D4ED8', 
  low: '#166534', 
  pending: '#AEAEB2'
};

export default function NurseDashboard() {
  const { nurse, logout } = useAuth();
  const [tab, setTab] = useState('waiting');
  
  // Modals & Panels
  const [qrUrl, setQrUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showAddNurse, setShowAddNurse] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const [handoverLoading, setHandoverLoading] = useState(false);

  // Filters & State
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [seenPatients, setSeenPatients] = useState([]);
  const [historyPatients, setHistoryPatients] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [addNurseForm, setAddNurseForm] = useState({ name: '', email: '', password: '' });
  const [addNurseError, setAddNurseError] = useState('');
  const [addNurseSuccess, setAddNurseSuccess] = useState('');
  const [addNurseLoading, setAddNurseLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(1);
  const [sortBy, setSortBy] = useState('critical'); 
  const [nightMode, setNightMode] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  
  // Selected Patient for detail panel
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const prevAlertsCount = useRef(0);

  const fetchDashboard = useCallback(async () => {
    const res = await api.get('/api/nurse/dashboard');
    return res.data;
  }, []);

  const { patients, alerts, loading, refetch, setAlerts } = useRealtimeDashboard(
    nurse?.hospitalId,
    fetchDashboard
  );

  // Monitor incoming alerts for screen flashing/vibration
  useEffect(() => {
    if (alerts.length > prevAlertsCount.current) {
      const newest = alerts[0];
      if (newest && (newest.alert_type === 'critical' || newest.alert_type === 'escalation')) {
        if (nightMode) {
          if (navigator.vibrate) {
            navigator.vibrate([300, 150, 300, 150, 300]);
          }
          setFlashActive(true);
          setTimeout(() => setFlashActive(false), 5000);
        } else {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5); 
          } catch (e) {
            console.error('Audio beep failed:', e);
          }
        }
      }
    }
    prevAlertsCount.current = alerts.length;
  }, [alerts, nightMode]);

  // Fetch extra data when tab changes
  useEffect(() => {
    if (tab === 'seen') loadSeen();
    if (tab === 'history') loadHistory();
    if (tab === 'team') loadTeam();
    loadStats();
  }, [tab]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [historyDays]);

  const loadSeen = async () => {
    try {
      const res = await api.get('/api/nurse/patients/seen');
      setSeenPatients(res.data.patients || []);
    } catch (e) { console.error(e); }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/api/nurse/patients/history?days=${historyDays}`);
      setHistoryPatients(res.data.patients || []);
    } catch (e) { console.error(e); }
  };

  const loadTeam = async () => {
    try {
      const res = await api.get('/api/nurse/team');
      setTeam(res.data.nurses || []);
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/api/nurse/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  // Auto-select patient
  useEffect(() => {
    if (patients.length > 0) {
      if (!selectedPatientId || !patients.some(p => p.id === selectedPatientId)) {
        const crit = patients.find(p => p.severity === 'critical');
        if (crit) {
          setSelectedPatientId(crit.id);
        } else {
          setSelectedPatientId(patients[0].id);
        }
      }
    } else {
      setSelectedPatientId(null);
    }
  }, [patients, selectedPatientId]);

  const handleAcknowledge = (alertId) => setAlerts(p => p.filter(a => a.id !== alertId));
  
  const handleMarkSeen = async (pid) => {
    try {
      await api.post(`/api/nurse/patient/${pid}/seen`);
      refetch();
      loadSeen();
      loadStats();
    } catch (e) {
      console.error('Failed to mark patient as seen:', e);
    }
  };

  const handleCallFamily = async (pid) => {
    try {
      await api.post(`/api/nurse/patient/${pid}/call`);
      refetch();
    } catch (e) {
      console.error('Failed to page patient:', e);
    }
  };

  const loadQR = async () => {
    if (qrUrl) { setShowQr(!showQr); return; }
    try {
      const res = await api.get(`/api/qr/${nurse.hospitalId}`);
      setQrUrl(res.data.qrDataUrl);
      setShowQr(true);
    } catch (e) { console.error(e); }
  };

  const handleHandover = async () => {
    setShowHandover(true);
    setHandoverLoading(true);
    setHandoverText('');
    try {
      const res = await api.get('/api/nurse/handover');
      setHandoverText(res.data.summary || 'No handover data compiled.');
    } catch (e) {
      setHandoverText('Failed to compile handover report. Please try again.');
    } finally {
      handoverLoading(false);
    }
  };

  const handleAddNote = async (pid) => {
    const p = patients.find(curr => curr.id === pid) || seenPatients.find(curr => curr.id === pid);
    const currentNotes = p?.nurse_notes || '';
    const val = window.prompt("Enter clinical observations/notes:", currentNotes);
    if (val !== null) {
      try {
        await api.put(`/api/nurse/patient/${pid}/notes`, { notes: val });
        refetch();
        loadSeen();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddNurse = async (e) => {
    e.preventDefault();
    setAddNurseError('');
    setAddNurseSuccess('');
    setAddNurseLoading(true);
    try {
      const res = await api.post('/api/nurse/register', addNurseForm);
      setAddNurseSuccess(`✅ Nurse "${res.data.nurse.name}" added!`);
      setAddNurseForm({ name: '', email: '', password: '' });
      loadTeam();
    } catch (e) {
      setAddNurseError(e.response?.data?.error || 'Failed to add nurse.');
    } finally {
      setAddNurseLoading(false);
    }
  };

  // Calculations for Stats Bar
  const totalWaiting = patients.length;
  const criticalCount = patients.filter(p => p.severity === 'critical').length;
  const highCount = patients.filter(p => p.severity === 'high').length;
  const avgWaitTime = patients.length > 0
    ? Math.round(patients.reduce((acc, p) => acc + (Date.now() - new Date(p.created_at).getTime()) / 60000, 0) / patients.length)
    : 0;

  // Patient filters
  const filteredWaiting = patients
    .filter(p => {
      // Search
      const matchSearch = !search || 
        p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        (p.triage_data?.[0]?.main_complaint || p.triage_data?.main_complaint || '').toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      // Severity Level Check
      if (severityFilter === 'no_response') {
        const lastActiveMins = (Date.now() - new Date(p.last_check_in).getTime()) / 60000;
        return lastActiveMins >= 30;
      }
      if (severityFilter !== 'all' && p.severity !== severityFilter) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'waiting') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return (b.severity_score || 0) - (a.severity_score || 0);
    });

  // Selected Patient Details
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Check if any patient is non-responsive for the alerts banner strip
  const nonResponsivePatient = patients.find(p => {
    const lastActiveMins = (Date.now() - new Date(p.last_check_in).getTime()) / 60000;
    return lastActiveMins >= 30;
  });

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#F8F7F4',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* 52px sidebar */}
      <Sidebar 
        activeTab={tab} 
        setActiveTab={setTab} 
        onShowQR={loadQR} 
        onLogout={logout} 
      />

      {/* Main Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '0' }}>
        
        {/* Header Bar (50px height) */}
        <header style={{
          height: '50px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E6E1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C1E' }}>ER Waiting Room</span>
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#8E8E93' }}> — Nurse {(nurse?.name || 'Staff').replace(/^Nurse\s+/i, '')} · Shift 2:00 PM – 10:00 PM</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setNightMode(prev => !prev)} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #E2E0DB',
                backgroundColor: '#FFFFFF',
                color: '#3C3C3E',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <MdDarkMode size={12} /> {nightMode ? 'Night Mode ON' : 'Day Mode'}
            </button>
            <button 
              onClick={handleHandover} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #E2E0DB',
                backgroundColor: '#FFFFFF',
                color: '#3C3C3E',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <MdDescription size={12} /> Handover
            </button>
            <button 
              onClick={loadQR} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                backgroundColor: '#1C1C1E',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <MdQrCode size={12} /> Show QR
            </button>
          </div>
        </header>

        {/* Stats Bar (64px height) */}
        <section style={{
          height: '64px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E6E1',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          flexShrink: 0
        }}>
          {[
            { num: criticalCount, label: 'CRITICAL', sub: 'Needs immediate attention', color: '#D93025' },
            { num: highCount, label: 'HIGH', sub: 'Monitor closely', color: '#D97706' },
            { num: totalWaiting, label: 'WAITING', sub: `Avg wait: ${avgWaitTime}m`, color: '#2563EB' },
            { num: stats?.seenToday ?? 0, label: 'SEEN TODAY', sub: 'Since shift start', color: '#166534' }
          ].map((cell, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 24px',
              borderRight: idx < 3 ? '1px solid #E8E6E1' : 'none',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '32px', fontWeight: 600, color: cell.color, lineHeight: 1 }}>{cell.num}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: cell.color }} />
                <span style={{ fontSize: '10px', fontWeight: 400, color: '#AEAEB2', letterSpacing: '0.05em' }}>{cell.label}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#8E8E93', marginTop: '1px' }}>{cell.sub}</span>
            </div>
          ))}
        </section>

        {/* Screen flash overlay for critical silent night-mode alerts */}
        {flashActive && <div className="cl-critical-screen-flash" />}

        {/* Dynamic content wrapper (Queue + Detail Panel) */}
        <div style={{ display: 'flex', flex: 1, minHeight: '0' }}>
          
          {/* Patients Queue List Column */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
            
            {/* Tabs Row */}
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #E8E6E1', marginBottom: '16px', flexShrink: 0 }}>
              {TABS.map(t => {
                const isActive = tab === t.id;
                let count = 0;
                if (t.id === 'waiting') count = patients.length;
                if (t.id === 'seen') count = seenPatients.length;

                const tabLabel = (t.id === 'waiting' || t.id === 'seen') ? `${t.label} (${count})` : t.label;

                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#2563EB' : '#6B6B70',
                      border: 'none',
                      background: 'none',
                      padding: '8px 0 6px',
                      borderBottom: isActive ? '2px solid #2563EB' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      marginBottom: '-1px'
                    }}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Alert banner strip (no response >30min) */}
            {nonResponsivePatient && (
              <AlertBanner 
                alerts={[{ id: nonResponsivePatient.id, message: `${nonResponsivePatient.patient_name || 'Unknown Patient'} hasn't responded in ${Math.floor((Date.now() - new Date(nonResponsivePatient.last_check_in).getTime()) / 60000)} min — family may have left their phone` }]} 
                onAcknowledge={() => refetch()} 
              />
            )}

            {/* WAITING QUEUE LIST VIEW */}
            {tab === 'waiting' && (
              <>
                {/* Search & Sort Row */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E0DB', borderRadius: '6px', padding: '6px 12px', flex: 1 }}>
                    <MdSearch size={14} color="#AEAEB2" style={{ marginRight: '6px' }} />
                    <input 
                      type="text" 
                      placeholder="Search patient name or complaint…"
                      value={search} 
                      onChange={e => setSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', color: '#1C1C1E' }}
                    />
                  </div>
                  <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value)}
                    style={{ border: '1px solid #E2E0DB', backgroundColor: '#FFFFFF', fontSize: '11px', borderRadius: '6px', padding: '0 12px', outline: 'none', color: '#1C1C1E' }}
                  >
                    <option value="critical">Sort: Most critical</option>
                    <option value="waiting">Sort: Waiting longest</option>
                  </select>
                </div>

                {/* Filters chips Row */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
                  {[
                    { id: 'all', label: `All (${patients.length})`, bgClass: '#1C1C1E', txtColor: '#FFFFFF', bColor: '#1C1C1E' },
                    { id: 'critical', label: `Critical (${patients.filter(p => p.severity === 'critical').length})`, bgClass: '#FEF2F2', txtColor: '#D93025', bColor: '#FECACA' },
                    { id: 'high', label: `High (${patients.filter(p => p.severity === 'high').length})`, bgClass: '#FFFBEB', txtColor: '#B45309', bColor: '#FDE68A' },
                    { id: 'medium', label: `Medium (${patients.filter(p => p.severity === 'medium').length})`, bgClass: '#EFF6FF', txtColor: '#1D4ED8', bColor: '#BFDBFE' },
                    { id: 'low', label: `Low (${patients.filter(p => p.severity === 'low').length})`, bgClass: '#F0FDF4', txtColor: '#166534', bColor: '#BBF7D0' }
                  ].map(chip => {
                    const isActive = severityFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => setSeverityFilter(chip.id)}
                        style={{
                          fontSize: '11px',
                          fontWeight: isActive ? 600 : 400,
                          borderRadius: '16px',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          outline: 'none',
                          border: `1px solid ${isActive ? chip.bColor : '#E2E0DB'}`,
                          backgroundColor: isActive ? chip.bgClass : '#FFFFFF',
                          color: isActive ? chip.txtColor : '#6B6B70'
                        }}
                      >
                        {chip.label}
                      </button>
                    );
                  })}

                  {/* No response toggle chip */}
                  <button
                    onClick={() => setSeverityFilter(p => p === 'no_response' ? 'all' : 'no_response')}
                    style={{
                      marginLeft: 'auto',
                      fontSize: '11px',
                      fontWeight: severityFilter === 'no_response' ? 600 : 400,
                      borderRadius: '16px',
                      padding: '4px 12px',
                      cursor: 'pointer',
                      outline: 'none',
                      border: '1px solid #FDE68A',
                      backgroundColor: '#FFFBEB',
                      color: '#B45309'
                    }}
                  >
                    ⚠️ No response ({patients.filter(p => {
                      const lastActiveMins = (Date.now() - new Date(p.last_check_in).getTime()) / 60000;
                      return lastActiveMins >= 30;
                    }).length})
                  </button>
                </div>

                {/* Queue list component */}
                <div style={{ flex: 1 }}>
                  <QueueList
                    patients={filteredWaiting}
                    selectedPatientId={selectedPatientId}
                    setSelectedPatientId={setSelectedPatientId}
                    onMarkSeen={handleMarkSeen}
                    onCallBack={handleCallFamily}
                    onAddNote={handleAddNote}
                  />
                </div>
              </>
            )}

            {/* SEEN TODAY VIEW */}
            {tab === 'seen' && (
              <div style={{ flex: 1 }}>
                {seenPatients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#AEAEB2' }}>
                    <MdGroup size={28} style={{ display: 'block', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B70', margin: 0 }}>No patients seen</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {seenPatients.map(p => {
                      const triage = p.triage_data?.[0] || p.triage_data || {};
                      return (
                        <div key={p.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C1E' }}>{p.patient_name || 'Anonymous'}</span>
                            <p style={{ fontSize: '11px', color: '#6B6B70', margin: '2px 0 0' }}>{triage.main_complaint || 'N/A'}</p>
                          </div>
                          <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Seen</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SHIFT LOG HISTORICAL VIEW */}
            {tab === 'history' && (
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#6B6B70' }}>Time Range:</span>
                  <select 
                    value={historyDays} 
                    onChange={e => setHistoryDays(Number(e.target.value))}
                    style={{ border: '1px solid #E2E0DB', backgroundColor: '#FFFFFF', fontSize: '11px', borderRadius: '6px', padding: '4px 10px', outline: 'none' }}
                  >
                    <option value={1}>Today</option>
                    <option value={3}>Last 3 days</option>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </div>
                {historyPatients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#AEAEB2' }}>
                    <MdGroup size={28} style={{ display: 'block', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B70', margin: 0 }}>No records found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyPatients.map(p => (
                      <div key={p.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C1E' }}>{p.patient_name || 'Anonymous'}</span>
                          <p style={{ fontSize: '11px', color: '#6B6B70', margin: '2px 0 0' }}>{p.status === 'seen' ? 'Discharged' : 'Active waiting'}</p>
                        </div>
                        <span style={{ fontSize: '11px', color: '#8E8E93' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MANAGE STAFF VIEW */}
            {tab === 'team' && (
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#6B6B70' }}>Staff Registry</span>
                  <button 
                    onClick={() => setShowAddNurse(true)}
                    style={{ border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '11px', fontWeight: 500, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', outline: 'none' }}
                  >
                    Add Nurse
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {team.map(n => (
                    <div key={n.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                        {n.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C1E' }}>{n.name}</span>
                        <p style={{ fontSize: '11px', color: '#6B6B70', margin: '2px 0 0' }}>{n.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Detail Panel Column */}
          <DetailPanel
            patient={selectedPatient}
            onCall={handleCallFamily}
            onAddNote={handleAddNote}
            onMarkSeen={handleMarkSeen}
          />

        </div>

      </div>

      {/* QR Modal Overlay */}
      {showQr && qrUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowQr(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '24px', maxWidth: '360px', width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C1E', margin: '0 0 12px' }}>Patient Entry QR Code</h3>
            <img src={qrUrl} alt="QR Code" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto 16px' }} />
            <button 
              onClick={() => setShowQr(false)}
              style={{ border: 'none', backgroundColor: '#1C1C1E', color: '#FFFFFF', fontSize: '11px', fontWeight: 500, borderRadius: '6px', padding: '6px 16px', cursor: 'pointer', outline: 'none' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add Nurse Modal Overlay */}
      {showAddNurse && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddNurse(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '20px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C1E', margin: 0 }}>Add New Nurse</h3>
              <button onClick={() => setShowAddNurse(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><MdClose size={18} /></button>
            </div>
            <form onSubmit={handleAddNurse} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Full Name"
                value={addNurseForm.name} 
                onChange={e => setAddNurseForm(p => ({ ...p, name: e.target.value }))}
                required
                style={{ border: '1px solid #E2E0DB', borderRadius: '6px', padding: '8px', fontSize: '12px', outline: 'none' }}
              />
              <input 
                type="email" 
                placeholder="Email Address"
                value={addNurseForm.email} 
                onChange={e => setAddNurseForm(p => ({ ...p, email: e.target.value }))}
                required
                style={{ border: '1px solid #E2E0DB', borderRadius: '6px', padding: '8px', fontSize: '12px', outline: 'none' }}
              />
              <input 
                type="password" 
                placeholder="Password"
                value={addNurseForm.password} 
                onChange={e => setAddNurseForm(p => ({ ...p, password: e.target.value }))}
                required
                style={{ border: '1px solid #E2E0DB', borderRadius: '6px', padding: '8px', fontSize: '12px', outline: 'none' }}
              />
              {addNurseError && <p style={{ color: '#D93025', fontSize: '11px', margin: 0 }}>{addNurseError}</p>}
              {addNurseSuccess && <p style={{ color: '#166534', fontSize: '11px', margin: 0 }}>{addNurseSuccess}</p>}
              <button 
                type="submit" 
                disabled={addNurseLoading}
                style={{ border: 'none', backgroundColor: '#1C1C1E', color: '#FFFFFF', fontSize: '11px', fontWeight: 500, borderRadius: '6px', padding: '8px', cursor: 'pointer', outline: 'none', marginTop: '6px' }}
              >
                {addNurseLoading ? 'Adding...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shift Handover Modal */}
      {showHandover && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowHandover(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '20px', maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C1E', margin: 0 }}>📋 Shift Handover Summary</h3>
              <button onClick={() => setShowHandover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><MdClose size={18} /></button>
            </div>
            <textarea
              readOnly
              value={handoverText}
              style={{ width: '100%', height: '240px', fontFamily: 'monospace', fontSize: '11px', border: '1px solid #E2E0DB', borderRadius: '6px', padding: '8px', resize: 'none', boxSizing: 'border-box', outline: 'none', color: '#1C1C1E' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(handoverText);
                  alert('Handover report copied!');
                }}
                style={{ border: '1px solid #E2E0DB', backgroundColor: '#FFFFFF', color: '#3C3C3E', fontSize: '11px', fontWeight: 500, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}
              >
                Copy
              </button>
              <button 
                onClick={() => setShowHandover(false)}
                style={{ border: 'none', backgroundColor: '#1C1C1E', color: '#FFFFFF', fontSize: '11px', fontWeight: 500, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
