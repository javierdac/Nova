import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle, LanguageSwitcher } from '@/components/layout/ThemeLanguageControls';
import { Logo } from '@/components/shared/Logo';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: 'admin@nova.dev', password: 'Password123!' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const res = await api.post(path, form);
      setSession(res.data.data);
      navigate('/dashboard');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-14 w-14 rounded-2xl" />
          <div>
            <h1 className="text-2xl font-bold">{t('brand.name')}</h1>
            <p className="text-sm text-muted-foreground">{t('brand.platform')}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
