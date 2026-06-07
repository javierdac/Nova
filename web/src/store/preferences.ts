import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { type Language } from '@/i18n';

export type Theme = 'light' | 'dark';

interface PreferencesState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
}

/** Applies the theme to <html> so Tailwind's `dark:` variant + CSS vars switch. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // default look; user can switch to light
      language: 'es', // Spanish by default
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
    }),
    { name: 'nova-prefs' },
  ),
);

/** Call once at boot to sync persisted prefs with the DOM + i18n. */
export function bootstrapPreferences(): void {
  const { theme, language } = usePreferences.getState();
  applyTheme(theme);
  if (i18n.language !== language) void i18n.changeLanguage(language);
}
