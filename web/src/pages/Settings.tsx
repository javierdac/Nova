import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Languages } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { usePreferences } from '@/store/preferences';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';

export default function Settings() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const { theme, setTheme, language, setLanguage } = usePreferences();

  // ── Profile form ──────────────────────────────────────
  const [profile, setProfile] = useState({ name: user?.name ?? '', title: user?.title ?? '', timezone: user?.timezone ?? 'UTC' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/me', profile);
      const updated = res.data.data as User;
      setUser({ ...(user as User), name: updated.name, title: updated.title, timezone: updated.timezone });
      setProfileMsg(t('settings.profileUpdated'));
    } catch (err) {
      setProfileErr(apiError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password form ─────────────────────────────────────
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', pwd);
      setPwdMsg(t('settings.passwordUpdated'));
      setPwd({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwdErr(apiError(err));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('pages.settings.title')} subtitle={t('pages.settings.subtitle')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editable profile */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('settings.editProfile')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('common.name')}</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('common.email')}</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.title')}</Label>
                <Input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.timezone')}</Label>
                <Input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} placeholder="UTC" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('common.role')}:</span>
                <Badge variant="secondary">{user ? t(`roles.${user.role}`) : ''}</Badge>
              </div>
              {profileMsg && <p className="text-sm text-emerald-400">{profileMsg}</p>}
              {profileErr && <p className="text-sm text-red-400">{profileErr}</p>}
              <Button type="submit" disabled={savingProfile}>{t('settings.saveProfile')}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Preferences: theme + language */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('settings.preferences')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('settings.appearance')}</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4" /> {t('theme.light')}
                  </Button>
                  <Button type="button" variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4" /> {t('theme.dark')}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('language.label')}</Label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value as 'es' | 'en')} className="w-auto min-w-[180px]">
                  <option value="es">{t('language.es')}</option>
                  <option value="en">{t('language.en')}</option>
                </Select>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Languages className="h-3 w-3" /> {t('language.switch')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('settings.changePassword')}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('settings.currentPassword')}</Label>
                  <Input type="password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('settings.newPassword')}</Label>
                  <Input type="password" minLength={8} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required />
                </div>
                {pwdMsg && <p className="text-sm text-emerald-400">{pwdMsg}</p>}
                {pwdErr && <p className="text-sm text-red-400">{pwdErr}</p>}
                <Button type="submit" disabled={savingPwd}>{t('settings.updatePassword')}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
