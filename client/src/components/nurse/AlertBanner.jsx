import { useState, useEffect } from 'react';
import { MdErrorOutline } from 'react-icons/md';
import api from '../../lib/api';

export default function AlertBanner({ alerts, onAcknowledge }) {
  const currentAlert = alerts[0]; // Show the most recent alert

  if (!currentAlert) return null;

  const handleAck = async () => {
    try {
      await api.post(`/api/nurse/alerts/${currentAlert.id}/ack`);
      onAcknowledge(currentAlert.id);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '6px',
      padding: '7px 12px',
      margin: '0 24px 12px',
      boxSizing: 'border-box'
    }}>
      <MdErrorOutline size={16} color="#D93025" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '11px', color: '#D93025', flex: 1 }}>
        {currentAlert.message}
      </span>
      <button
        onClick={handleAck}
        style={{
          fontSize: '10px',
          color: '#AEAEB2',
          border: '1px solid #FECACA',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          padding: '2px 8px',
          cursor: 'pointer',
          outline: 'none',
          flexShrink: 0
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
