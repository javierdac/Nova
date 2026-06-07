import { AlertTriangle, ShieldAlert, Rocket, Users2, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrief, type Domain, type Severity } from '@/api/leadership';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiError } from '@/lib/api';

const DOMAIN_ICON: Record<Domain, typeof Rocket> = {
  reliability: ShieldAlert,
  delivery: Rocket,
  people: Users2,
  cost: Wallet,
};
const SEV_VARIANT: Record<Severity, 'danger' | 'warning' | 'secondary'> = {
  high: 'danger',
  medium: 'warning',
  low: 'secondary',
};

export default function Brief() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useBrief();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  return (
    <div>
      <PageHeader title={t('pages.brief.title')} subtitle={t('pages.brief.subtitle')} />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 pt-5">
          <AlertTriangle className={`h-5 w-5 ${d.summary.high > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          <p className="text-base font-medium">{d.headline}</p>
        </CardContent>
      </Card>

      <section className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label={t('brief.high')} value={d.summary.high} tone={d.summary.high > 0 ? 'danger' : 'success'} />
        <StatCard label={t('brief.medium')} value={d.summary.medium} tone={d.summary.medium > 0 ? 'warning' : 'success'} />
        <StatCard label={t('brief.low')} value={d.summary.low} />
      </section>

      <div className="space-y-3">
        {d.items.length === 0 ? (
          <Card><CardContent className="pt-5 text-sm text-muted-foreground">{t('brief.allClear')}</CardContent></Card>
        ) : (
          d.items.map((item, i) => {
            const Icon = DOMAIN_ICON[item.domain];
            return (
              <Card key={i}>
                <CardContent className="flex items-start gap-3 pt-5">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEV_VARIANT[item.severity]}>{t(`brief.sev.${item.severity}`)}</Badge>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{t(`brief.domain.${item.domain}`)}</span>
                    </div>
                    <p className="mt-1 font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
