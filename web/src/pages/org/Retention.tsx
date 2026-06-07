import { useState } from 'react';
import { HeartPulse, AlertTriangle, ShieldCheck, Info, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAttritionRisk } from '@/api/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const BAND_TONE = { high: 'danger', medium: 'warning', low: 'success' } as const;

// Mirrors computeAttritionRisk() in server/src/modules/org/org.service.ts.
const SCORE_RULES = [
  { key: 'highAttrition', pts: 35 },
  { key: 'medAttrition', pts: 18 },
  { key: 'lowMorale', pts: 25 },
  { key: 'medMorale', pts: 10 },
  { key: 'heavyOnCall', pts: 15 },
  { key: 'flightWindow', pts: 15 },
  { key: 'tenurePlateau', pts: 8 },
  { key: 'seniority', pts: 7 },
] as const;

function MethodCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{t('org.method.title')}</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <CardContent className="space-y-4 pt-0 text-sm">
          <p className="text-muted-foreground">{t('org.method.intro')}</p>

          <div>
            <p className="mb-1 font-medium">{t('org.method.inputsTitle')}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t('org.method.signals')}</li>
              <li>{t('org.method.tenure')}</li>
              <li>{t('org.method.seniority')}</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-medium">{t('org.method.rulesTitle')}</p>
            <ul className="space-y-1">
              {SCORE_RULES.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 border-b border-border/50 py-1 last:border-0">
                  <span className="text-muted-foreground">{t(`org.method.rules.${r.key}`)}</span>
                  <Badge variant="secondary" className="shrink-0">+{r.pts}</Badge>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">{t('org.method.bandsTitle')}</p>
            <p className="text-muted-foreground">{t('org.method.bandsDetail')}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Retention() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useAttritionRisk();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;

  return (
    <div>
      <PageHeader title={t('pages.retention.title')} subtitle={t('pages.retention.subtitle')} />

      <SourceNotice message={t('sourceNotice.retention')} links={[{ to: '/teams', label: t('nav.teams') }]} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('org.highRisk')} value={data?.summary.high ?? 0} icon={AlertTriangle} tone="danger" />
        <StatCard label={t('org.mediumRisk')} value={data?.summary.medium ?? 0} icon={HeartPulse} tone="warning" />
        <StatCard label={t('org.lowRisk')} value={data?.summary.low ?? 0} icon={ShieldCheck} tone="success" />
      </section>

      <MethodCard />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('org.peopleByRisk')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>{t('org.person')}</TH><TH>{t('common.team')}</TH><TH>{t('org.tenure')}</TH><TH>{t('org.score')}</TH><TH>{t('org.risk')}</TH><TH>{t('org.factors')}</TH></TR></THead>
            <TBody>
              {data?.people.map((p) => (
                <TR key={p.userId}>
                  <TD>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.title}</p>
                  </TD>
                  <TD className="text-muted-foreground">{p.team ?? '—'}</TD>
                  <TD>{p.tenureMonths}{t('org.monthsShort')}</TD>
                  <TD className="font-semibold">{p.riskScore}</TD>
                  <TD><Badge variant={BAND_TONE[p.band]}>{t(`org.band.${p.band}`, { defaultValue: p.band })}</Badge></TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {p.factors.length ? p.factors.map((f) => <Badge key={f} variant="secondary" className="text-[10px]">{t(`org.factorLabels.${f}`, { defaultValue: f })}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
