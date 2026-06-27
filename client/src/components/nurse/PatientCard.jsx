import { useState } from 'react';
import { MdCampaign, MdEditNote, MdCheck } from 'react-icons/md';

const SEVERITY_COLORS = {
  critical: '#D93025',
  high: '#D97706',
  medium: '#1D4ED8',
  low: '#166534',
  pending: '#AEAEB2'
};

const SEVERITY_BADGES = {
  critical: { bg: '#FEF2F2', text: '#D93025', label: 'CRIT' },
  high: { bg: '#FFFBEB', text: '#B45309', label: 'HIGH' },
  medium: { bg: '#EFF6FF', text: '#1D4ED8', label: 'MED' },
  low: { bg: '#F0FDF4', text: '#166534', label: 'LOW' },
  pending: { bg: '#F4F3F0', text: '#6B6B70', label: 'PEND' }
};

function formatWaitTime(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getWaitTimeColor(createdAt) {
  const diffHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (diffHours < 1) return '#166534';
  if (diffHours < 3) return '#D97706';
  return '#D93025';
}

function formatLastCheckin(lastCheckIn) {
  const diff = Date.now() - new Date(lastCheckIn).getTime();
  const m = Math.floor(diff / 60000);
  return m < 1 ? 'Just now' : `${m}m ago`;
}

export default function PatientCard({ p, isSelected, onClick, onCall, onAddNote, onMarkSeen }) {
  const triage = p.triage_data?.[0] || p.triage_data || {};
  const severityColor = SEVERITY_COLORS[p.severity] || SEVERITY_COLORS.pending;
  const badge = SEVERITY_BADGES[p.severity] || SEVERITY_BADGES.pending;

  const waitTimeStr = formatWaitTime(p.created_at);
  const waitColor = getWaitTimeColor(p.created_at);
  const lastActiveMins = Math.floor((Date.now() - new Date(p.last_check_in).getTime()) / 60000);
  const isNoResponse = lastActiveMins >= 30;

  // Determine trend status from scores
  let trendText = 'Same condition';
  let trendBg = '#F4F3F0';
  let trendColor = '#6B6B70';

  if (p.trend && p.trend.length > 1) {
    const firstScore = p.trend[0].score;
    const lastScore = p.trend[p.trend.length - 1].score;
    if (lastScore > firstScore + 5) {
      trendText = 'Condition worsened';
      trendBg = '#FEF2F2';
      trendColor = '#D93025';
    } else if (lastScore < firstScore - 5) {
      trendText = 'Condition improved';
      trendBg = '#F0FDF4';
      trendColor = '#166534';
    }
  }

  if (isNoResponse) {
    trendText = `No response ${lastActiveMins}m`;
    trendBg = '#FFFBEB';
    trendColor = '#B45309';
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid',
        borderColor: isSelected ? '#1C1C1E' : '#E8E6E1',
        borderRadius: '8px',
        borderLeft: `3px solid ${severityColor}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
        marginBottom: '8px'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#C7C7CC';
          e.currentTarget.style.backgroundColor = '#FAFAF8';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#E8E6E1';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
    >
      {/* ROW 1: Main Info */}
      <div style={{
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {/* Badge */}
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          backgroundColor: badge.bg,
          color: badge.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 600
        }}>
          {badge.label}
        </div>

        {/* Name + Complaint */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1', minWidth: '0' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            #{p.queue_position || '—'} · {(() => {
              const capitalize = (str) => {
                if (!str) return '';
                return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              };
              const patientName = capitalize(p.patient_name || 'Anonymous');
              const detailsStr = (triage.age || triage.gender) ? `, ${triage.age || ''}${triage.gender || ''}` : '';
              return `${patientName}${detailsStr}`;
            })()}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B6B70', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.severity === 'pending' || !p.severity_score ? 'Triage in progress...' : `${triage.main_complaint || 'N/A'} · Score ${p.severity_score}/100`}
          </span>
        </div>

        {/* Wait Time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: waitColor }}>
            {waitTimeStr}
          </span>
          <span style={{ fontSize: '10px', color: '#AEAEB2', textTransform: 'lowercase' }}>
            waiting
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onCall(p.id)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: isNoResponse ? '1px solid #FECACA' : '1px solid #E2E0DB',
              backgroundColor: isNoResponse ? '#FEF2F2' : '#FFFFFF',
              color: isNoResponse ? '#D93025' : '#3C3C3E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none'
            }}
            title="Call family"
          >
            <MdCampaign size={14} />
          </button>
          <button
            onClick={() => onAddNote(p.id)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid #E2E0DB',
              backgroundColor: '#FFFFFF',
              color: '#3C3C3E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none'
            }}
            title="Add note"
          >
            <MdEditNote size={14} />
          </button>
          <button
            onClick={() => onMarkSeen(p.id)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid #E2E0DB',
              backgroundColor: '#FFFFFF',
              color: '#3C3C3E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none'
            }}
            title="Mark as seen"
          >
            <MdCheck size={14} />
          </button>
        </div>
      </div>

      {/* ROW 2: Tags */}
      <div style={{
        padding: '0 12px 8px',
        paddingLeft: '46px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        {/* Language Pill */}
        <span style={{
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 7px'
        }}>
          {(() => {
            const LANG_MAP = { en: 'English', te: 'Telugu', hi: 'Hindi' };
            return LANG_MAP[p.language] || (p.language || 'en').toUpperCase();
          })()}
        </span>

        {/* Condition Pill */}
        <span style={{
          backgroundColor: trendBg,
          color: trendColor,
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 7px'
        }}>
          {trendText}
        </span>

        {/* Known Conditions Pill */}
        {triage.previous_conditions && triage.previous_conditions !== 'none' && triage.previous_conditions !== 'None' && (
          <span style={{
            backgroundColor: '#F4F3F0',
            color: '#3C3C3E',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px'
          }}>
            {triage.previous_conditions}
          </span>
        )}

        {/* Last check-in */}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#AEAEB2' }}>
          Last check-in {formatLastCheckin(p.last_check_in)}
        </span>
      </div>

      {/* ROW 3: Severity Bar */}
      <div style={{
        margin: '0 12px 8px',
        marginLeft: '46px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{
          height: '2px',
          backgroundColor: '#F4F3F0',
          borderRadius: '1px',
          overflow: 'hidden',
          width: '100%'
        }}>
          {p.severity_score > 0 && (
            <div style={{
              height: '100%',
              width: `${p.severity_score}%`,
              backgroundColor: severityColor
            }} />
          )}
        </div>
        {(!p.severity_score || p.severity_score === 0) && (
          <span style={{ fontSize: '10px', color: '#AEAEB2', fontWeight: 600 }}>Triage pending</span>
        )}
      </div>
    </div>
  );
}
