import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import te from './locales/te.json';
import hi from './locales/hi.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    te: { translation: te },
    hi: { translation: hi },
    en: { translation: en },
  },
  lng: 'te', // Default to Telugu
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
