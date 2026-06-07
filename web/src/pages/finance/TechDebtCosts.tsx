import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTechDebtCostAnalytics } from '@/api/finance';
import { useTechDebt, useTeams } from '@/api/hooks';
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

const impactTone = (l: string) => (l === 'critical' ? 'danger' : l === 'high' ? 'warning' : 'secondary');

interface TechDebtCostRow {
  _id: string; technicalDebt: string; team?: string;
  hoursLostPerMonth: number; averageHourlyRate: number; impactLevel?: string; estimatedMonthlyCost?: number;
}

export default function TechDebtCosts() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useTechDebtCostAnalytics();
  const debts = useTechDebt({ limit: 100 });
  const teams = useTeams({ limit: 100 });
  const debtOpts = (debts.data?.data ?? []).map((x) => ({ value: x._id, label: x.title }));
  const debtName = new Map(debtOpts.map((o) => [o.value, o.label]));
  const teamOpts = (teams.data?.data ?? []).map((x) => ({ value: x._id, label: x.name }));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'technicalDebt', label: t('techDebt.item'), type: 'select', options: debtOpts, required: true, span: 2 },
    { name: 'team', label: t('common.team'), type: 'select', options: teamOpts, span: 2 },
    { name: 'hoursLostPerMonth', label: t('finance.hoursPerMonth'), type: 'number', min: 0, required: true },
    { name: 'averageHourlyRate', label: t('finance.hourlyRate'), type: 'number', min: 0, required: true },
    { name: 'impactLevel', label: t('finance.impactLevel'), type: 'select', options: ['low', 'medium', 'high', 'critical'].map((v) => ({ value: v, label: t(`projects.priorities.${v}`) })), span: 2 },
  ];
  const columns: LedgerColumn<TechDebtCostRow>[] = [
    { header: t('techDebt.item'), render: (r) => <span className="font-medium">{debtName.get(r.technicalDebt) ?? '—'}</span> },
    { header: t('finance.hoursPerMonth'), render: (r) => r.hoursLostPerMonth },
    { header: t('finance.hourlyRate'), render: (r) => formatUSD(r.averageHourlyRate) },
    { header: t('finance.impactLevel'), render: (r) => r.impactLevel ? <Badge variant={impactTone(r.impactLevel)}>{t(`projects.priorities.${r.impactLevel}`)}</Badge> : '—' },
  ];

  const rows = d.top.map((t, i) => ({
    rank: i + 1,
    item: t.technicalDebt?.title ?? '—',
    team: t.team?.name ?? '—',
    hoursLostPerMonth: t.hoursLostPerMonth,
    impactLevel: t.impactLevel,
    estimatedMonthlyCost: t.estimatedMonthlyCost,
  }));

  return (
    <div>
      <PageHeader title={t('pages.techDebtCosts.title')} subtitle={t('pages.techDebtCosts.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('tech-debt-costs', rows)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t('finance.monthlyDebtCost')} value={formatUSD(d.totalMonthlyCost)} tone="warning" />
        <StatCard label={t('finance.annualizedCost')} value={formatUSD(d.totalAnnualCost)} tone="danger" />
        <StatCard label={t('finance.trackedItems')} value={d.top.length} />
      </section>

      <FinChartCard title={t('finance.debtByTeam')}><CostBar data={d.byTeam} dataKey="total" nameKey="team" /></FinChartCard>

      <Card className="mt-6">
        <Table>
          <THead><TR><TH>#</TH><TH>{t('techDebt.item')}</TH><TH>{t('common.team')}</TH><TH>{t('finance.hoursPerMonth')}</TH><TH>{t('finance.impactLevel')}</TH><TH>{t('finance.monthlyCost')}</TH></TR></THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.rank}>
                <TD className="text-muted-foreground">{r.rank}</TD>
                <TD className="font-medium">{r.item}</TD>
                <TD className="text-muted-foreground">{r.team}</TD>
                <TD>{r.hoursLostPerMonth}</TD>
                <TD><Badge variant={impactTone(r.impactLevel)}>{t(`projects.priorities.${r.impactLevel}`)}</Badge></TD>
                <TD className="font-semibold">{formatUSD(r.estimatedMonthlyCost)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <FinanceLedger<TechDebtCostRow>
        resource="tech-debt-costs"
        title={t('finance.techDebtCostEntries')}
        fields={fields}
        columns={columns}
        empty={{ technicalDebt: '', team: '', hoursLostPerMonth: 0, averageHourlyRate: 100, impactLevel: 'medium' }}
        toForm={(r) => ({ technicalDebt: r.technicalDebt, team: r.team ?? '', hoursLostPerMonth: r.hoursLostPerMonth, averageHourlyRate: r.averageHourlyRate, impactLevel: r.impactLevel ?? 'medium' })}
        rowLabel={(r) => debtName.get(r.technicalDebt) ?? t('techDebt.item')}
        invalidateKeys={['fin-techdebt']}
      />
    </div>
  );
}
