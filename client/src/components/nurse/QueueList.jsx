import { useState } from 'react';
import { MdGroup } from 'react-icons/md';
import PatientCard from './PatientCard';

export default function QueueList({
  patients,
  selectedPatientId,
  setSelectedPatientId,
  onMarkSeen,
  onCallBack,
  onAddNote,
  currentLang
}) {
  if (!patients || patients.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#AEAEB2' }}>
        <MdGroup size={28} style={{ display: 'block', margin: '0 auto 8px' }} />
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B70', margin: 0 }}>No patients waiting</p>
        <p style={{ fontSize: '11px', marginTop: '4px', margin: '4px 0 0' }}>New patients appear here when they scan the QR code</p>
      </div>
    );
  }

  // Section 1: NEEDS ATTENTION NOW (critical and high)
  const needsAttention = patients.filter(p => p.severity === 'critical' || p.severity === 'high');

  // Section 2: MONITORING (medium, low, pending)
  const monitoring = patients.filter(p => p.severity === 'medium' || p.severity === 'low' || p.severity === 'pending');

  const sectionHeaderStyle = {
    fontSize: '10px',
    fontWeight: 600,
    color: '#AEAEB2',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    marginTop: '14px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* NEEDS ATTENTION NOW */}
      {needsAttention.length > 0 && (
        <div>
          <div style={sectionHeaderStyle}>Needs Attention Now</div>
          <div>
            {needsAttention.map(p => (
              <PatientCard
                key={p.id}
                p={p}
                isSelected={p.id === selectedPatientId}
                onClick={() => setSelectedPatientId(p.id)}
                onCall={onCallBack}
                onAddNote={onAddNote} // Notes logic handled inside DetailPanel
                onMarkSeen={onMarkSeen}
              />
            ))}
          </div>
        </div>
      )}

      {/* MONITORING */}
      {monitoring.length > 0 && (
        <div>
          <div style={sectionHeaderStyle}>Monitoring</div>
          <div>
            {monitoring.map(p => (
              <PatientCard
                key={p.id}
                p={p}
                isSelected={p.id === selectedPatientId}
                onClick={() => setSelectedPatientId(p.id)}
                onCall={onCallBack}
                onAddNote={onAddNote}
                onMarkSeen={onMarkSeen}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
