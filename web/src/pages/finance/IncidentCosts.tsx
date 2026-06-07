import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIncidentCostAnalytics } from '@/api/finance';
import { useIncidents, useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Button } from '@/components/ui/button';
import { FinChartCard, CostBar, CostLine, PALETTE } from '@/components/charts/FinanceCharts';
import { FinanceLedger, type LedgerField, type LedgerColumn } from '@/components/finance/FinanceLedger';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

interface IncidentCostRow {
  _id: string; incident: string; team?: string; severity?: string;
  engineersInvolved: number; durationHours: number; estimatedHourlyRate: number; customerImpactScore?: number; estimatedCost?: number;
}

export default function IncidentCosts() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useIncidentCostAnalytics();
  const incidents = useIncidents({ limit: 100 });
  const teams = useTeams({ limit: 100 });
  const incidentOpts = (incidents.data?.data ?? []).map((x) => ({ value: x._id, label: x.title }));
  const incidentName = new Map(incidentOpts.map((o) => [o.value, o.label]));
  const teamOpts = (teams.data?.data ?? []).map((x) => ({ value: x._id, label: x.name }));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'incident', label: t('incidents.incident'), type: 'select', options: incidentOpts, required: true, span: 2 },
    { name: 'team', label: t('common.team'), type: 'select', options: teamOpts },
    { name: 'severity', label: t('incidents.severity'), type: 'select', options: ['SEV1', 'SEV2', 'SEV3', 'SEV4'].map((s) => ({ value: s, label: s })) },
    { name: 'engineersInvolved', label: t('finance.engineersInvolved'), type: 'number', min: 0, required: true },
    { name: 'durationHours', label: t('finance.durationHours'), type: 'number', min: 0, required: true },
    { name: 'estimatedHourlyRate', label: t('finance.hourlyRate'), type: 'number', min: 0, required: true },
    { name: 'customerImpactScore', label: t('finance.customerImpact'), type: 'number', min: 0, max: 10 },
  ];
  const columns: LedgerColumn<IncidentCostRow>[] = [
    { header: t('incidents.incident'), render: (r) => <span className="font-medium">{incidentName.get(r.incident) ?? '—'}</span> },
    { header: t('incidents.severity'), render: (r) => r.severity ?? '—' },
    { header: t('finance.engineersInvolved'), render: (r) => r.engineersInvolved },
    { header: t('finance.durationHours'), render: (r) => r.durationHours },
    { header: t('finance.monthlyCost'), render: (r) => formatUSD(r.estimatedCost ?? 0) },
  ];

  return (
    <div>
      <PageHeader title={t('pages.incidentCosts.title')} subtitle={t('pages.incidentCosts.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('incident-costs-by-severity', d.bySeverity)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />
      <IntegrationNotice sources={['pagerduty']} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('finance.totalIncidentCost')} value={formatUSD(d.totalCost)} tone="danger" />
        <StatCard label={t('finance.severityBuckets')} value={d.bySeverity.length} />
        <StatCard label={t('finance.teamsImpacted')} value={d.byTeam.length} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('finance.costBySeverity')}><CostBar data={d.bySeverity} dataKey="total" nameKey="severity" /></FinChartCard>
        <FinChartCard title={t('finance.costByTeam')}><CostBar data={d.byTeam} dataKey="total" nameKey="team" /></FinChartCard>
        <FinChartCard title={t('finance.incidentCostTrend')}><CostLine data={d.trend} keys={[{ key: 'total', color: PALETTE[3] }]} /></FinChartCard>
      </section>

      <FinanceLedger<IncidentCostRow>
        resource="incident-costs"
        title={t('finance.incidentCostEntries')}
        fields={fields}
        columns={columns}
        empty={{ incident: '', team: '', severity: 'SEV3', engineersInvolved: 1, durationHours: 1, estimatedHourlyRate: 100, customerImpactScore: 0 }}
        toForm={(r) => ({ incident: r.incident, team: r.team ?? '', severity: r.severity ?? 'SEV3', engineersInvolved: r.engineersInvolved, durationHours: r.durationHours, estimatedHourlyRate: r.estimatedHourlyRate, customerImpactScore: r.customerImpactScore ?? 0 })}
        rowLabel={(r) => incidentName.get(r.incident) ?? t('incidents.incident')}
        invalidateKeys={['fin-incidents']}
      />
    </div>
  );
}
