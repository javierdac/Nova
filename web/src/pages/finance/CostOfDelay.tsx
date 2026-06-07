import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCostOfDelayAnalytics } from '@/api/finance';
import { useProjects, useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { FinChartCard, CostBar } from '@/components/charts/FinanceCharts';
import { FinanceLedger, type LedgerField, type LedgerColumn } from '@/components/finance/FinanceLedger';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

const COD_STATUSES = ['at_risk', 'delayed', 'shipped', 'cancelled'];

interface CostOfDelayRow {
  _id: string; featureName: string; product?: string; team?: string;
  expectedMonthlyRevenue: number; delayMonths: number; status?: string; estimatedCostOfDelay?: number;
}

export default function CostOfDelay() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useCostOfDelayAnalytics();
  const projects = useProjects({ limit: 100 });
  const teams = useTeams({ limit: 100 });
  const productOpts = (projects.data?.data ?? []).map((x) => ({ value: x._id, label: x.name }));
  const teamOpts = (teams.data?.data ?? []).map((x) => ({ value: x._id, label: x.name }));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'featureName', label: t('common.feature'), type: 'text', required: true, span: 2 },
    { name: 'product', label: t('common.product'), type: 'select', options: productOpts },
    { name: 'team', label: t('common.team'), type: 'select', options: teamOpts },
    { name: 'expectedMonthlyRevenue', label: t('finance.expectedRevenue'), type: 'number', min: 0, required: true },
    { name: 'delayMonths', label: t('common.delay'), type: 'number', min: 0, required: true },
    { name: 'status', label: t('common.status'), type: 'select', options: COD_STATUSES.map((s) => ({ value: s, label: t(`finance.codStatuses.${s}`) })), span: 2 },
  ];
  const columns: LedgerColumn<CostOfDelayRow>[] = [
    { header: t('common.feature'), render: (r) => <span className="font-medium">{r.featureName}</span> },
    { header: t('finance.expectedRevenue'), render: (r) => formatUSD(r.expectedMonthlyRevenue) },
    { header: t('common.delay'), render: (r) => `${r.delayMonths} ${t('common.months')}` },
    { header: t('common.status'), render: (r) => r.status ? <Badge variant={r.status === 'delayed' ? 'danger' : 'warning'}>{t(`finance.codStatuses.${r.status}`)}</Badge> : '—' },
  ];

  const chart = d.top.map((t) => ({ feature: t.featureName, cost: t.estimatedCostOfDelay }));
  const rows = d.top.map((t) => ({
    feature: t.featureName,
    product: t.product?.name ?? '—',
    expectedMonthlyRevenue: t.expectedMonthlyRevenue,
    delayMonths: t.delayMonths,
    estimatedCostOfDelay: t.estimatedCostOfDelay,
    status: t.status,
  }));

  return (
    <div>
      <PageHeader title={t('pages.costOfDelay.title')} subtitle={t('pages.costOfDelay.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('cost-of-delay', rows)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t('finance.revenueAtRisk')} value={formatUSD(d.totalRevenueAtRisk)} tone="danger" />
        <StatCard label={t('finance.delayedInitiatives')} value={d.top.length} tone="warning" />
      </section>

      <FinChartCard title={t('finance.codByInitiative')}><CostBar data={chart} dataKey="cost" nameKey="feature" /></FinChartCard>

      <Card className="mt-6">
        <Table>
          <THead><TR><TH>{t('common.feature')}</TH><TH>{t('common.product')}</TH><TH>{t('finance.expectedRevenue')}</TH><TH>{t('common.delay')}</TH><TH>{t('nav.costOfDelay')}</TH><TH>{t('common.status')}</TH></TR></THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.feature}>
                <TD className="font-medium">{r.feature}</TD>
                <TD className="text-muted-foreground">{r.product}</TD>
                <TD>{formatUSD(r.expectedMonthlyRevenue)}</TD>
                <TD className="text-muted-foreground">{r.delayMonths} {t('common.months')}</TD>
                <TD className="font-semibold text-amber-500">{formatUSD(r.estimatedCostOfDelay)}</TD>
                <TD><Badge variant={r.status === 'delayed' ? 'danger' : 'warning'}>{t(`finance.codStatuses.${r.status}`)}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <FinanceLedger<CostOfDelayRow>
        resource="cost-of-delay"
        title={t('finance.costOfDelayEntries')}
        fields={fields}
        columns={columns}
        empty={{ featureName: '', product: '', team: '', expectedMonthlyRevenue: 0, delayMonths: 0, status: 'at_risk' }}
        toForm={(r) => ({ featureName: r.featureName, product: r.product ?? '', team: r.team ?? '', expectedMonthlyRevenue: r.expectedMonthlyRevenue, delayMonths: r.delayMonths, status: r.status ?? 'at_risk' })}
        rowLabel={(r) => r.featureName}
        invalidateKeys={['fin-cod']}
      />
    </div>
  );
}
