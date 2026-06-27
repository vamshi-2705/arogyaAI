import api from '../../lib/api';

/**
 * Language selector — toggle between Telugu, Hindi, and English.
 */
export default function LanguageSelector({ sessionId, currentLanguage, onLanguageChange }) {
  const handleSelect = async (lang) => {
    if (lang === currentLanguage) return;

    onLanguageChange(lang);

    if (sessionId) {
      try {
        await api.patch(`/api/patient/session/${sessionId}`, { language: lang });
      } catch (err) {
        console.error('Failed to update language:', err);
      }
    }
  };

  return (
    <div className="lang-selector">
      <button
        className={`lang-btn ${currentLanguage === 'te' ? 'lang-btn--active' : ''}`}
        onClick={() => handleSelect('te')}
        title="Telugu"
      >
        తె
      </button>
      <button
        className={`lang-btn ${currentLanguage === 'hi' ? 'lang-btn--active' : ''}`}
        onClick={() => handleSelect('hi')}
        title="Hindi"
      >
        हि
      </button>
      <button
        className={`lang-btn ${currentLanguage === 'en' ? 'lang-btn--active' : ''}`}
        onClick={() => handleSelect('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
