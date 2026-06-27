import { MdList, MdNotifications, MdHistory, MdQrCode, MdSettings, MdExitToApp } from 'react-icons/md';

export default function Sidebar({ activeTab, setActiveTab, onShowQR, onLogout }) {
  const topIcons = [
    { id: 'waiting', icon: <MdList size={18} />, label: 'Queue' },
    { id: 'seen', icon: <MdNotifications size={18} />, label: 'Seen today' },
    { id: 'history', icon: <MdHistory size={18} />, label: 'History' },
    { id: 'qr', icon: <MdQrCode size={18} />, label: 'QR', action: onShowQR }
  ];

  return (
    <div style={{
      width: '52px',
      height: '100vh',
      backgroundColor: '#1C1C1E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      boxSizing: 'border-box',
      flexShrink: 0
    }}>
      {/* Top Logo */}
      <div style={{
        width: '32px',
        height: '32px',
        backgroundColor: '#2563EB',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 600,
        fontSize: '14px',
        marginBottom: '16px'
      }}>
        ♥
      </div>

      {/* Top Nav Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
        {topIcons.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : setActiveTab(item.id)}
              title={item.label}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: isActive ? '#2563EB' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B6B70',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#2C2C2E';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6B6B70';
                }
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Bottom Nav Slots */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
        <button
          title="Settings"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#6B6B70',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2C2C2E';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6B6B70';
          }}
        >
          <MdSettings size={18} />
        </button>
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#6B6B70',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2C2C2E';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6B6B70';
          }}
        >
          <MdExitToApp size={18} />
        </button>
      </div>
    </div>
  );
}
