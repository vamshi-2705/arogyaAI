import { MdCampaign, MdEditNote, MdCheck } from 'react-icons/md';

const SEVERITY_COLORS = {
  critical: '#D93025',
  high: '#D97706',
  medium: '#1D4ED8',
  low: '#166534',
  pending: '#AEAEB2'
};

export default function DetailPanel({ patient, onCall, onAddNote, onMarkSeen }) {
  if (!patient) {
    return (
      <div style={{
        width: '220px',
        borderLeft: '1px solid #E8E6E1',
        backgroundColor: '#FFFFFF',
        padding: '14px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#AEAEB2',
        fontSize: '11px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        Select a patient to view details
      </div>
    );
  }

  const triage = patient.triage_data?.[0] || patient.triage_data || {};
  const severityColor = SEVERITY_COLORS[patient.severity] || SEVERITY_COLORS.pending;

  // Pull last 7 checks for trending
  const trendChecks = (patient.trend || []).slice(-7);
  // Pad with dummy empty scores if less than 7 to keep layout consistent, or just map what exists
  const firstScore = trendChecks[0]?.score || patient.severity_score || 0;
  const lastScore = trendChecks[trendChecks.length - 1]?.score || patient.severity_score || 0;

  return (
    <div style={{
      width: '220px',
      borderLeft: '1px solid #E8E6E1',
      backgroundColor: '#FFFFFF',
      padding: '14px 14px 14px 14px',
      paddingRight: '14px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flexShrink: 0,
      overflowY: 'auto'
    }}>
      {/* Patient Header */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C1E', margin: 0 }}>
          {(() => {
            const capitalize = (str) => {
              if (!str) return '';
              return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            };
            return capitalize(patient.patient_name || 'Anonymous');
          })()}
        </h3>
        <p style={{ fontSize: '11px', color: '#8E8E93', margin: '4px 0 0' }}>
          {(() => {
            const detailsStr = (triage.age || triage.gender) ? `${triage.age || ''}${triage.gender || ''} · ` : '';
            return `${detailsStr}Patient #${patient.queue_position || '—'} · ${(patient.severity || '').toUpperCase()}`;
          })()}
        </p>
      </div>

      {/* Triage Summary */}
      <div>
        <h4 style={{ fontSize: '10px', fontWeight: 600, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
          Triage Summary
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { label: 'Complaint', val: triage.main_complaint || 'N/A' },
            { label: 'Pain level', val: triage.pain_level ? `${triage.pain_level} / 10` : 'N/A' },
            { label: 'Duration', val: triage.duration_hours ? `${triage.duration_hours}h` : 'N/A' },
            { label: 'History', val: triage.previous_conditions || 'None' },
            { label: 'Language', val: (() => {
              const LANG_MAP = { en: 'English', te: 'Telugu', hi: 'Hindi' };
              return LANG_MAP[patient.language] || (patient.language || 'en').toUpperCase();
            })() }
          ].map((row, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderBottom: '0.5px solid #F4F3F0',
              fontSize: '11px',
              gap: '8px'
            }}>
              <span style={{ color: '#8E8E93' }}>{row.label}</span>
              <span style={{ color: '#1C1C1E', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word', maxWidth: '120px' }}>
                {row.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Severity Over Time Chart */}
      <div>
        <h4 style={{ fontSize: '10px', fontWeight: 600, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
          Severity Over Time
        </h4>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '50px', gap: '2px', paddingBottom: '4px', borderBottom: '1px solid #F4F3F0' }}>
          {trendChecks.map((t, idx) => {
            const pct = Math.max(10, Math.min(100, t.score));
            return (
              <div
                key={idx}
                title={`Score: ${t.score}`}
                style={{
                  width: '10px',
                  height: `${pct}%`,
                  backgroundColor: severityColor,
                  borderRadius: '1px',
                  opacity: 0.3 + (idx / trendChecks.length) * 0.7
                }}
              />
            );
          })}
        </div>
        <p style={{ fontSize: '10px', color: '#8E8E93', margin: '4px 0 0' }}>
          Score {firstScore} → {lastScore}
        </p>
      </div>

      {/* Stacked Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: 'auto' }}>
        <button
          onClick={() => onCall(patient.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: '#1C1C1E',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '7px',
            width: '100%',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <MdCampaign size={14} /> Call family now
        </button>
        <button
          onClick={() => onAddNote(patient.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            color: '#3C3C3E',
            border: '1px solid #E2E0DB',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '7px',
            width: '100%',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <MdEditNote size={14} /> Add note
        </button>
        <button
          onClick={() => onMarkSeen(patient.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            color: '#3C3C3E',
            border: '1px solid #E2E0DB',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '7px',
            width: '100%',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <MdCheck size={14} /> Mark as seen
        </button>
      </div>
    </div>
  );
}
