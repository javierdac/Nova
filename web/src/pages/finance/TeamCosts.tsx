import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeamCostAnalytics } from '@/api/finance';
import { useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { FinChartCard, CostBar, CostLine, PALETTE } from '@/components/charts/FinanceCharts';
import { FinanceLedger, type LedgerField, type LedgerColumn } from '@/components/finance/FinanceLedger';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

interface TeamCostRow {
  _id: string; team: string; month: number; year: number;
  payrollCost?: number; infrastructureAllocation?: number; toolingAllocation?: number; contractorCost?: number; headcount?: number;
}

const now = new Date();

export default function TeamCosts() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useTeamCostAnalytics();
  const teams = useTeams({ limit: 100 });
  const teamOpts = (teams.data?.data ?? []).map((tm) => ({ value: tm._id, label: tm.name }));
  const teamName = new Map(teamOpts.map((o) => [o.value, o.label]));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'team', label: t('common.team'), type: 'select', options: teamOpts, required: true, span: 2 },
    { name: 'month', label: t('finance.month'), type: 'number', min: 1, max: 12, required: true },
    { name: 'year', label: t('finance.year'), type: 'number', required: true },
    { name: 'headcount', label: t('common.headcount'), type: 'number', min: 0 },
    { name: 'payrollCost', label: t('finance.payroll'), type: 'number', min: 0 },
    { name: 'infrastructureAllocation', label: t('finance.infrastructure'), type: 'number', min: 0 },
    { name: 'toolingAllocation', label: t('finance.saasTools'), type: 'number', min: 0 },
    { name: 'contractorCost', label: t('finance.contractors'), type: 'number', min: 0 },
  ];
  const columns: LedgerColumn<TeamCostRow>[] = [
    { header: t('common.team'), render: (r) => <span className="font-medium">{teamName.get(r.team) ?? '—'}</span> },
    { header: t('common.period'), render: (r) => <span className="text-muted-foreground">{r.year}-{String(r.month).padStart(2, '0')}</span> },
    { header: t('finance.payroll'), render: (r) => formatUSD(r.payrollCost ?? 0) },
    { header: t('finance.infrastructure'), render: (r) => formatUSD(r.infrastructureAllocation ?? 0) },
    { header: t('common.headcount'), render: (r) => r.headcount ?? '—' },
  ];

  return (
    <div>
      <PageHeader title={t('pages.teamCosts.title')} subtitle={t('pages.teamCosts.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('team-costs', d.byTeam)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('finance.costByTeam')}><CostBar data={d.byTeam} dataKey="total" nameKey="team" /></FinChartCard>
        <FinChartCard title={t('finance.monthlyTrend')}><CostLine data={d.trend} keys={[{ key: 'total', color: PALETTE[0] }]} /></FinChartCard>
      </section>

      <Card>
        <Table>
          <THead><TR><TH>{t('common.team')}</TH><TH>{t('common.headcount')}</TH><TH>{t('common.total')}</TH><TH>{t('common.cost')}/Eng.</TH><TH>{t('finance.payrollFromSalaries')}</TH><TH>{t('finance.costPerPerson')}</TH></TR></THead>
          <TBody>
            {d.byTeam.map((tm) => (
              <TR key={tm.teamId}>
                <TD className="font-medium">{tm.team ?? 'Unassigned'}</TD>
                <TD className="text-muted-foreground">{tm.headcount ?? '—'}</TD>
                <TD>{formatUSD(tm.total)}</TD>
                <TD>{formatUSD(tm.avgPerEngineer)}</TD>
                <TD>{tm.actualAnnualPayroll ? formatUSD(tm.actualAnnualPayroll) : '—'}</TD>
                <TD>{tm.costPerPerson ? formatUSD(tm.costPerPerson) : '—'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <FinanceLedger<TeamCostRow>
        resource="team-costs"
        title={t('finance.teamCostEntries')}
        fields={fields}
        columns={columns}
        empty={{ team: '', month: now.getMonth() + 1, year: now.getFullYear(), headcount: 0, payrollCost: 0, infrastructureAllocation: 0, toolingAllocation: 0, contractorCost: 0 }}
        toForm={(r) => ({ team: r.team, month: r.month, year: r.year, headcount: r.headcount ?? 0, payrollCost: r.payrollCost ?? 0, infrastructureAllocation: r.infrastructureAllocation ?? 0, toolingAllocation: r.toolingAllocation ?? 0, contractorCost: r.contractorCost ?? 0 })}
        rowLabel={(r) => `${teamName.get(r.team) ?? t('common.team')} · ${r.year}-${String(r.month).padStart(2, '0')}`}
        invalidateKeys={['fin-teams', 'fin-exec']}
      />
    </div>
  );
}
