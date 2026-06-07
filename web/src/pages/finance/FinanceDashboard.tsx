import { DollarSign, Server, Boxes, Users2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExecutiveCost } from '@/api/finance';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Button } from '@/components/ui/button';
import { FinChartCard, CostLine, CostBar, CostDonut, PALETTE } from '@/components/charts/FinanceCharts';
import { FinanceLedger, type LedgerField, type LedgerColumn } from '@/components/finance/FinanceLedger';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

interface EngineeringCostRow {
  _id: string; month: number; year: number;
  payrollCost?: number; infrastructureCost?: number; saasToolsCost?: number; contractorsCost?: number; totalCost?: number;
}

const now = new Date();

export default function FinanceDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useExecutiveCost();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'month', label: t('finance.month'), type: 'number', min: 1, max: 12, required: true },
    { name: 'year', label: t('finance.year'), type: 'number', required: true },
    { name: 'payrollCost', label: t('finance.payroll'), type: 'number', min: 0 },
    { name: 'infrastructureCost', label: t('finance.infrastructure'), type: 'number', min: 0 },
    { name: 'saasToolsCost', label: t('finance.saasTools'), type: 'number', min: 0 },
    { name: 'contractorsCost', label: t('finance.contractors'), type: 'number', min: 0 },
  ];
  const columns: LedgerColumn<EngineeringCostRow>[] = [
    { header: t('common.period'), render: (r) => <span className="font-medium">{r.year}-{String(r.month).padStart(2, '0')}</span> },
    { header: t('finance.payroll'), render: (r) => formatUSD(r.payrollCost ?? 0) },
    { header: t('finance.infrastructure'), render: (r) => formatUSD(r.infrastructureCost ?? 0) },
    { header: t('finance.saasTools'), render: (r) => formatUSD(r.saasToolsCost ?? 0) },
    { header: t('finance.contractors'), render: (r) => formatUSD(r.contractorsCost ?? 0) },
  ];

  return (
    <div>
      <PageHeader
        title={t('pages.finance.title')}
        subtitle={t('pages.finance.subtitle')}
        action={
          <Button variant="outline" onClick={() => exportToCSV('engineering-cost-by-team', d.byTeam)}>
            <Download className="h-4 w-4" /> {t('common.exportCsv')}
          </Button>
        }
      />
      <IntegrationNotice sources={['cloud']} />
      <SourceNotice
        message={t('sourceNotice.finance')}
        links={[
          { to: '/finance/teams', label: t('nav.teamCosts') },
          { to: '/finance/products', label: t('nav.productCosts') },
          { to: '/finance/saas', label: t('nav.saasCosts') },
        ]}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t('finance.totalCost')} value={formatUSD(d.current.totalCost)} sub={t('finance.perMonth')} icon={DollarSign} tone="default" />
        <StatCard label={t('finance.payroll')} value={formatUSD(d.current.payrollCost)} icon={Users2} />
        <StatCard label={t('finance.infrastructure')} value={formatUSD(d.current.infrastructureCost)} icon={Server} />
        <StatCard label={t('finance.saasTools')} value={formatUSD(d.current.saasToolsCost)} icon={Boxes} />
        <StatCard label={t('finance.contractors')} value={formatUSD(d.current.contractorsCost)} icon={Users2} tone="warning" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('finance.monthlyTrend')}>
          <CostLine
            data={d.monthlyTrend}
            keys={[
              { key: 'totalCost', color: PALETTE[0] },
              { key: 'payrollCost', color: PALETTE[1] },
              { key: 'infrastructureCost', color: PALETTE[2] },
            ]}
          />
        </FinChartCard>
        <FinChartCard title={t('finance.costByCategory')}>
          <CostDonut data={d.categoryBreakdown} dataKey="amount" nameKey="category" />
        </FinChartCard>
        <FinChartCard title={t('finance.costByTeam')}>
          <CostBar data={d.byTeam} dataKey="total" nameKey="team" />
        </FinChartCard>
        <FinChartCard title={t('finance.costByProduct')}>
          <CostBar data={d.byProduct} dataKey="total" nameKey="product" />
        </FinChartCard>
      </section>

      <FinanceLedger<EngineeringCostRow>
        resource="engineering-costs"
        title={t('finance.engineeringCostEntries')}
        fields={fields}
        columns={columns}
        empty={{ month: now.getMonth() + 1, year: now.getFullYear(), payrollCost: 0, infrastructureCost: 0, saasToolsCost: 0, contractorsCost: 0 }}
        toForm={(r) => ({ month: r.month, year: r.year, payrollCost: r.payrollCost ?? 0, infrastructureCost: r.infrastructureCost ?? 0, saasToolsCost: r.saasToolsCost ?? 0, contractorsCost: r.contractorsCost ?? 0 })}
        rowLabel={(r) => `${r.year}-${String(r.month).padStart(2, '0')}`}
        invalidateKeys={['fin-exec']}
      />
    </div>
  );
}
