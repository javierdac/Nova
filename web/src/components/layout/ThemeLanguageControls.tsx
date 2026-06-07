import { Moon, Sun, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/store/preferences';
import type { Language } from '@/i18n';

export function ThemeToggle() {
  const { theme, toggleTheme } = usePreferences();
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('theme.toggle')} title={t('theme.toggle')}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();
  const next: Language = language === 'es' ? 'en' : 'es';
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 px-2"
      onClick={() => setLanguage(next)}
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">{language}</span>
    </Button>
  );
}
