import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHiringRoiAnalytics } from '@/api/finance';
import { useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { FinChartCard, CostBar } from '@/components/charts/FinanceCharts';
import { FinanceLedger, type LedgerField, type LedgerColumn } from '@/components/finance/FinanceLedger';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

const SENIORITIES = ['junior', 'mid', 'senior', 'staff', 'principal'];
const HIRING_STATUSES = ['proposed', 'approved', 'hired', 'rejected'];

interface HiringRoiRow {
  _id: string; role: string; team?: string; seniority?: string;
  annualCost: number; estimatedProductivityGain?: number; estimatedRevenueImpact?: number; status?: string; estimatedROI?: number;
}

export default function HiringROI() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useHiringRoiAnalytics();
  const teams = useTeams({ limit: 100 });
  const teamOpts = (teams.data?.data ?? []).map((x) => ({ value: x._id, label: x.name }));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const chart = d.comparison.map((c) => ({ role: c.role, roi: c.estimatedROI }));

  const fields: LedgerField[] = [
    { name: 'role', label: t('common.role'), type: 'text', required: true, span: 2 },
    { name: 'team', label: t('common.team'), type: 'select', options: teamOpts },
    { name: 'seniority', label: t('common.seniority'), type: 'select', options: SENIORITIES.map((s) => ({ value: s, label: s })) },
    { name: 'annualCost', label: t('finance.annualCost'), type: 'number', min: 0, required: true },
    { name: 'estimatedRevenueImpact', label: t('finance.revenueImpact'), type: 'number', min: 0 },
    { name: 'estimatedProductivityGain', label: t('finance.productivityGain'), type: 'number' },
    { name: 'status', label: t('common.status'), type: 'select', options: HIRING_STATUSES.map((s) => ({ value: s, label: t(`finance.hiringStatuses.${s}`) })) },
  ];
  const columns: LedgerColumn<HiringRoiRow>[] = [
    { header: t('common.role'), render: (r) => <span className="font-medium">{r.role}</span> },
    { header: t('finance.annualCost'), render: (r) => formatUSD(r.annualCost) },
    { header: t('finance.revenueImpact'), render: (r) => formatUSD(r.estimatedRevenueImpact ?? 0) },
    { header: t('common.status'), render: (r) => r.status ? <span className="text-muted-foreground">{t(`finance.hiringStatuses.${r.status}`)}</span> : '—' },
  ];

  return (
    <div>
      <PageHeader title={t('pages.hiringRoi.title')} subtitle={t('pages.hiringRoi.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('hiring-roi', d.comparison)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />

      <FinChartCard title={t('finance.roiByRole')}><CostBar data={chart} dataKey="roi" nameKey="role" /></FinChartCard>

      <Card className="mt-6">
        <Table>
          <THead><TR><TH>{t('common.role')}</TH><TH>{t('common.cost')}</TH><TH>{t('common.revenue')}</TH><TH>{t('finance.costOfNotHiring')}</TH><TH>ROI</TH><TH>{t('common.status')}</TH></TR></THead>
          <TBody>
            {d.comparison.map((c) => (
              <TR key={c.role}>
                <TD className="font-medium">{c.role}</TD>
                <TD>{formatUSD(c.annualCost)}</TD>
                <TD>{formatUSD(c.estimatedRevenueImpact)}</TD>
                <TD className={c.costOfNotHiring >= 0 ? 'text-emerald-500' : 'text-red-500'}>{formatUSD(c.costOfNotHiring)}</TD>
                <TD><Badge variant={c.estimatedROI >= 100 ? 'success' : c.estimatedROI >= 0 ? 'warning' : 'danger'}>{c.estimatedROI}%</Badge></TD>
                <TD className="text-muted-foreground">{t(`finance.hiringStatuses.${c.status}`)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <FinanceLedger<HiringRoiRow>
        resource="hiring-roi"
        title={t('finance.hiringRoiEntries')}
        fields={fields}
        columns={columns}
        empty={{ role: '', team: '', seniority: 'mid', annualCost: 0, estimatedRevenueImpact: 0, estimatedProductivityGain: 0, status: 'proposed' }}
        toForm={(r) => ({ role: r.role, team: r.team ?? '', seniority: r.seniority ?? 'mid', annualCost: r.annualCost, estimatedRevenueImpact: r.estimatedRevenueImpact ?? 0, estimatedProductivityGain: r.estimatedProductivityGain ?? 0, status: r.status ?? 'proposed' })}
        rowLabel={(r) => r.role}
        invalidateKeys={['fin-hiring']}
      />
    </div>
  );
}
