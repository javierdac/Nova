import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForecast } from '@/api/okrs';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';

const BAND_TONE = { likely: 'success', at_risk: 'warning', unlikely: 'danger', done: 'default' } as const;
const fmtDate = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: '2-digit' });
const pct = (p: number | null) => (p === null ? '—' : `${Math.round(p * 100)}%`);

export default function DeliveryForecast() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, error } = useForecast();
  if (isLoading) return <LoadingState label={t('forecast.running')} />;
  if (isError) return <ErrorState message={apiError(error)} />;

  const rows = data ?? [];
  const likely = rows.filter((r) => r.band === 'likely' || r.band === 'done').length;
  const atRisk = rows.filter((r) => r.band === 'at_risk').length;
  const unlikely = rows.filter((r) => r.band === 'unlikely').length;
  const dt = (iso: string) => fmtDate(iso, i18n.language);

  return (
    <div>
      <PageHeader title={t('pages.forecast.title')} subtitle={t('pages.forecast.subtitle')} />
      <IntegrationNotice sources={['jira', 'github']} />
      <SourceNotice message={t('sourceNotice.forecast')} links={[{ to: '/projects', label: t('nav.projects') }]} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('forecast.likelyOnTime')} value={likely} icon={CheckCircle2} tone="success" />
        <StatCard label={t('forecast.atRisk')} value={atRisk} icon={AlertTriangle} tone="warning" />
        <StatCard label={t('forecast.unlikely')} value={unlikely} icon={XCircle} tone="danger" />
      </section>

      {!rows.length ? <EmptyState /> : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('forecast.activeProjects')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>{t('projects.project')}</TH><TH>{t('common.team')}</TH><TH>{t('common.progress')}</TH><TH>{t('forecast.velocity')}</TH><TH>P50</TH><TH>P85</TH><TH>{t('common.target')}</TH><TH>{t('forecast.onTime')}</TH></TR></THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.projectId}>
                    <TD className="font-medium">{r.name}{r.key ? ` (${r.key})` : ''}</TD>
                    <TD className="text-muted-foreground">{r.team ?? '—'}</TD>
                    <TD>{r.progress}%</TD>
                    <TD className="text-muted-foreground">{t('forecast.velocityValue', { value: r.weeklyVelocity })}</TD>
                    <TD>{r.band === 'done' ? '✓' : `${t('forecast.weeks', { n: r.p50Weeks })} · ${dt(r.p50Date)}`}</TD>
                    <TD>{r.band === 'done' ? '✓' : `${t('forecast.weeks', { n: r.p85Weeks })} · ${dt(r.p85Date)}`}</TD>
                    <TD className="text-muted-foreground">{r.targetDate ? dt(r.targetDate) : '—'}</TD>
                    <TD>
                      <Badge variant={BAND_TONE[r.band]}>{r.band === 'done' ? t('forecast.bands.done') : `${pct(r.onTimeProbability)} · ${t(`forecast.bands.${r.band}`)}`}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
