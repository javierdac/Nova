import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { es } from './locales/es';
import { en } from './locales/en';

export type Language = 'es' | 'en';

/** Reads the persisted language (set by the preferences store) or defaults to Spanish. */
function initialLanguage(): Language {
  try {
    const raw = localStorage.getItem('nova-prefs');
    const lng = raw ? (JSON.parse(raw)?.state?.language as Language) : undefined;
    if (lng === 'es' || lng === 'en') return lng;
  } catch {
    /* ignore */
  }
  return 'es';
}

void i18n.use(initReactI18next).init({
  resources: { es, en },
  lng: initialLanguage(),
  fallbackLng: 'es', // Spanish is the default / source language
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
