import { Rocket, AlertOctagon, Users2, ShieldAlert, Map, ArrowRight, AlertTriangle, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExecutiveSummary, useTrends } from '@/api/hooks';
import { useBrief, useScorecard } from '@/api/leadership';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartCard, TrendLine, TrendBar, CapacityArea } from '@/components/charts/Charts';
import { apiError } from '@/lib/api';

export default function Dashboard() {
  const { t } = useTranslation();
  const summary = useExecutiveSummary();
  const trends = useTrends(undefined, 90);
  const brief = useBrief();
  const scorecard = useScorecard();

  if (summary.isLoading || trends.isLoading) return <LoadingState />;
  if (summary.isError) return <ErrorState message={apiError(summary.error)} />;

  const s = summary.data!;

  const roadmapTone = s.roadmapHealth.score >= 75 ? 'success' : s.roadmapHealth.score >= 50 ? 'warning' : 'danger';
  const teamTone = s.teamHealth.score >= 75 ? 'success' : s.teamHealth.score >= 50 ? 'warning' : 'danger';

  const sc = scorecard.data;
  const br = brief.data;
  const scoreRing = sc ? (sc.global >= sc.target ? 'text-green-500' : sc.global >= sc.target - 15 ? 'text-amber-500' : 'text-red-500') : '';

  return (
    <div>
      <PageHeader title={t('pages.dashboard.title')} subtitle={t('pages.dashboard.subtitle')} />
      <IntegrationNotice sources={['github', 'jira', 'pagerduty']} />

      {/* Leadership strip: composite health + what needs attention */}
      {(sc || br) && (
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {sc && (
            <Link to="/scorecard" className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex items-center gap-4 pt-5">
                  <Gauge className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pages.scorecard.title')}</p>
                    <p className={`text-3xl font-bold ${scoreRing}`}>{sc.global}<span className="text-base font-normal text-muted-foreground">/100</span></p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          )}
          {br && (
            <Link to="/brief" className="group lg:col-span-2">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex items-center gap-4 pt-5">
                  <AlertTriangle className={`h-8 w-8 ${br.summary.high > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{t('pages.brief.title')}</p>
                    <p className="truncate font-medium">{br.headline}</p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {br.summary.high > 0 && <Badge variant="danger">{br.summary.high} {t('brief.sev.high')}</Badge>}
                    {br.summary.medium > 0 && <Badge variant="warning">{br.summary.medium} {t('brief.sev.medium')}</Badge>}
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t('dashboard.roadmapHealth')} value={`${s.roadmapHealth.score}%`} sub={t('dashboard.offTrack', { count: s.roadmapHealth.off_track })} icon={Map} tone={roadmapTone} />
        <StatCard label={t('dashboard.teamHealth')} value={`${s.teamHealth.score}/100`} sub={t('dashboard.teamsCount', { count: s.teamHealth.teams })} icon={Users2} tone={teamTone} />
        <StatCard label={t('dashboard.technicalRisks')} value={s.technicalRisks.openItems} sub={t('dashboard.highRisk', { count: s.technicalRisks.highRisk })} icon={ShieldAlert} tone={s.technicalRisks.highRisk > 0 ? 'warning' : 'success'} />
        <StatCard label={t('dashboard.deployments')} value={s.deploymentMetrics.deployments30d} sub={t('dashboard.leadCfr', { lead: s.deploymentMetrics.avgLeadTimeHours, cfr: s.deploymentMetrics.changeFailureRate })} icon={Rocket} />
        <StatCard label={t('dashboard.incidents')} value={s.incidentMetrics.total30d} sub={t('dashboard.sevMttr', { sev: s.incidentMetrics.sev1, mttr: s.incidentMetrics.avgMttrMinutes })} icon={AlertOctagon} tone={s.incidentMetrics.sev1 > 0 ? 'danger' : 'success'} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t('dashboard.leadTimeTrend')}>
          <TrendLine data={trends.data!.leadTime} dataKey="value" />
        </ChartCard>
        <ChartCard title={t('dashboard.deployFreqTrend')}>
          <TrendBar data={trends.data!.deploymentFrequency} dataKey="value" color="hsl(142 71% 45%)" />
        </ChartCard>
        <ChartCard title={t('dashboard.incidentTrend')}>
          <TrendBar data={trends.data!.incidentTrend} dataKey="count" color="hsl(0 72% 51%)" />
        </ChartCard>
        <ChartCard title={t('dashboard.capacityTrend')}>
          <CapacityArea data={trends.data!.teamCapacity} />
        </ChartCard>
      </section>
    </div>
  );
}
