import { Users2, UserCog, Briefcase, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrgChart, useHeadcount, useAttritionRisk } from '@/api/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiError } from '@/lib/api';
import type { OrgChart } from '@/types';

type Node = OrgChart['nodes'][number];

function Tree({ nodes, managerId, depth = 0 }: { nodes: Node[]; managerId: string | null; depth?: number }) {
  const { t } = useTranslation();
  const children = nodes.filter((n) => n.managerId === managerId);
  if (!children.length) return null;
  return (
    <ul className={depth > 0 ? 'ml-4 border-l pl-4' : ''}>
      {children.map((n) => (
        <li key={n.id} className="mt-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {n.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{n.name}</p>
              <p className="truncate text-xs text-muted-foreground">{n.title || n.role}</p>
            </div>
            {n.directReports > 0 && <Badge variant="secondary" className="ml-auto">{t('org.reports', { count: n.directReports })}</Badge>}
          </div>
          <Tree nodes={nodes} managerId={n.id} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default function PeopleDashboard() {
  const { t } = useTranslation();
  const chart = useOrgChart();
  const headcount = useHeadcount();
  const attrition = useAttritionRisk();

  if (chart.isLoading || headcount.isLoading || attrition.isLoading) return <LoadingState />;
  if (chart.isError) return <ErrorState message={apiError(chart.error)} />;

  const nodes = chart.data?.nodes ?? [];
  const stats = chart.data?.stats;

  return (
    <div>
      <PageHeader title={t('pages.peopleDashboard.title')} subtitle={t('pages.peopleDashboard.subtitle')} />

      <SourceNotice message={t('sourceNotice.peopleDashboard')} links={[{ to: '/users', label: t('nav.users') }, { to: '/teams', label: t('nav.teams') }]} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('org.people')} value={stats?.people ?? 0} icon={Users2} />
        <StatCard label={t('org.managers')} value={stats?.managers ?? 0} sub={t('org.maxSpan', { n: stats?.maxSpanOfControl ?? 0 })} icon={UserCog} />
        <StatCard label={t('org.openReqs')} value={headcount.data?.totals.open ?? 0} sub={t('org.budgetedMo', { amount: (headcount.data?.totals.openBudgetMonthly ?? 0).toLocaleString() })} icon={Briefcase} tone="warning" />
        <StatCard label={t('org.highFlightRisk')} value={attrition.data?.summary.high ?? 0} sub={t('org.mediumCount', { count: attrition.data?.summary.medium ?? 0 })} icon={HeartPulse} tone={attrition.data?.summary.high ? 'danger' : 'success'} />
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('org.reportingStructure')}</CardTitle></CardHeader>
        <CardContent>
          <Tree nodes={nodes} managerId={null} />
        </CardContent>
      </Card>
    </div>
  );
}
