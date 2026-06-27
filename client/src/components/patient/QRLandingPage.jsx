import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdLocalHospital } from 'react-icons/md';
import api from '../../lib/api';
import LoadingSpinner from '../shared/LoadingSpinner';

/**
 * QR Landing page — shown when patient first scans the QR code.
 * Collects language preference and optional patient name, then creates session.
 */
export default function QRLandingPage({ hospitalId }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('te');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const label = (te, hi, en) =>
    language === 'hi' ? hi : language === 'en' ? en : te;

  const handleStart = async () => {
    setLoading(true);
    setError('');

    try {
      // Change UI language
      i18n.changeLanguage(language);

      const res = await api.post('/api/patient/session', {
        hospitalId,
        language,
      });

      const { session } = res.data;

      // Update patient name if provided
      if (patientName.trim()) {
        await api.patch(`/api/patient/session/${session.id}`, {
          patient_name: patientName.trim(),
        });
      }

      navigate(`/patient/${session.id}`, {
        state: { language, greeting: res.data.greeting },
      });
    } catch (err) {
      setError(
        language === 'hi'
          ? 'सर्वर समस्या। कृपया सीधे नर्स को बताएं।'
          : language === 'en'
          ? 'Server error. Please inform the nurse directly.'
          : 'సర్వర్ సమస్య. దయచేసి నర్సుకు నేరుగా చెప్పండి.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-card">
        {/* Logo */}
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <MdLocalHospital size={48} color="#075E54" />
          </div>
          <h1 className="landing-title">AROGYA WATCH AI</h1>
          <p className="landing-subtitle">AI-Powered ER Waiting System</p>
        </div>

        {/* Language Selection */}
        <div className="landing-section">
          <p className="landing-label">
            {label('మీ భాష ఎంచుకోండి', 'अपनी भाषा चुनें', 'Select your language')}
          </p>
          <div className="landing-lang-btns">
            <button
              className={`landing-lang-btn ${language === 'te' ? 'landing-lang-btn--active' : ''}`}
              onClick={() => setLanguage('te')}
            >
              <span className="landing-lang-code">TE</span>
              <span>తెలుగు</span>
            </button>
            <button
              className={`landing-lang-btn ${language === 'hi' ? 'landing-lang-btn--active' : ''}`}
              onClick={() => setLanguage('hi')}
            >
              <span className="landing-lang-code">HI</span>
              <span>हिंदी</span>
            </button>
            <button
              className={`landing-lang-btn ${language === 'en' ? 'landing-lang-btn--active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              <span className="landing-lang-code">EN</span>
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Optional Patient Name */}
        <div className="landing-section">
          <label className="landing-label" htmlFor="patient-name">
            {label('రోగి పేరు (ఐచ్ఛికం)', 'मरीज़ का नाम (वैकल्पिक)', 'Patient name (optional)')}
          </label>
          <input
            id="patient-name"
            type="text"
            className="landing-input"
            placeholder={label('ఉదా: రాములు', 'जैसे: राम कुमार', 'e.g. Ramu')}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>

        {error && <p className="landing-error">{error}</p>}

        <button
          className="landing-start-btn"
          onClick={handleStart}
          disabled={loading}
          id="start-chat-btn"
        >
          {loading ? (
            <LoadingSpinner size="small" color="white" />
          ) : (
            label('చాట్ ప్రారంభించండి →', 'चैट शुरू करें →', 'Start Chat →')
          )}
        </button>

        <p className="landing-disclaimer">
          {label('యాప్ డౌన్‌లోడ్ అవసరం లేదు. పూర్తిగా ఉచితం.', 'कोई ऐप डाउनलोड नहीं। पूरी तरह मुफ़्त।', 'No app download. Completely free.')}
        </p>
      </div>
    </div>
  );
}
