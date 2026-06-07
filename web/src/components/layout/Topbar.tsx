import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { initials } from '@/lib/utils';
import { ThemeToggle, LanguageSwitcher } from './ThemeLanguageControls';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="mx-1 hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user ? t(`roles.${user.role}`) : ''}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initials(user?.name)}
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label={t('auth.logout')} title={t('auth.logout')}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
