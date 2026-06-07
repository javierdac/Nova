import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProductCostAnalytics } from '@/api/finance';
import { useProjects } from '@/api/hooks';
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

interface ProductCostRow {
  _id: string; product: string; month: number; year: number;
  payrollAllocation?: number; infrastructureAllocation?: number; toolingAllocation?: number; monthlyRevenue?: number;
}

const now = new Date();

export default function ProductCosts() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useProductCostAnalytics();
  const projects = useProjects({ limit: 100 });
  const productOpts = (projects.data?.data ?? []).map((p) => ({ value: p._id, label: p.name }));
  const productName = new Map(productOpts.map((o) => [o.value, o.label]));

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const fields: LedgerField[] = [
    { name: 'product', label: t('common.product'), type: 'select', options: productOpts, required: true, span: 2 },
    { name: 'month', label: t('finance.month'), type: 'number', min: 1, max: 12, required: true },
    { name: 'year', label: t('finance.year'), type: 'number', required: true },
    { name: 'payrollAllocation', label: t('finance.payroll'), type: 'number', min: 0 },
    { name: 'infrastructureAllocation', label: t('finance.infrastructure'), type: 'number', min: 0 },
    { name: 'toolingAllocation', label: t('finance.saasTools'), type: 'number', min: 0 },
    { name: 'monthlyRevenue', label: t('common.revenue'), type: 'number', min: 0 },
  ];
  const columns: LedgerColumn<ProductCostRow>[] = [
    { header: t('common.product'), render: (r) => <span className="font-medium">{productName.get(r.product) ?? '—'}</span> },
    { header: t('common.period'), render: (r) => <span className="text-muted-foreground">{r.year}-{String(r.month).padStart(2, '0')}</span> },
    { header: t('finance.payroll'), render: (r) => formatUSD(r.payrollAllocation ?? 0) },
    { header: t('common.revenue'), render: (r) => formatUSD(r.monthlyRevenue ?? 0) },
  ];

  return (
    <div>
      <PageHeader title={t('pages.productCosts.title')} subtitle={t('pages.productCosts.subtitle')} action={<Button variant="outline" onClick={() => exportToCSV('product-costs', d.byProduct)}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>} />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('finance.costByProduct')}><CostBar data={d.byProduct} dataKey="cost" nameKey="product" /></FinChartCard>
        <FinChartCard title={t('common.revenue')}><CostBar data={d.byProduct} dataKey="revenue" nameKey="product" /></FinChartCard>
      </section>

      <Card>
        <Table>
          <THead><TR><TH>{t('common.product')}</TH><TH>{t('common.cost')}</TH><TH>{t('common.revenue')}</TH><TH>{t('common.margin')}</TH><TH>{t('common.profitability')}</TH></TR></THead>
          <TBody>
            {d.byProduct.map((p) => (
              <TR key={p.product ?? Math.random()}>
                <TD className="font-medium">{p.product ?? 'Unassigned'}</TD>
                <TD>{formatUSD(p.cost)}</TD>
                <TD>{formatUSD(p.revenue)}</TD>
                <TD className={p.margin >= 0 ? 'text-emerald-500' : 'text-red-500'}>{formatUSD(p.margin)}</TD>
                <TD><Badge variant={p.profitabilityIndex >= 1.5 ? 'success' : p.profitabilityIndex >= 1 ? 'warning' : 'danger'}>{p.profitabilityIndex}x</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <FinanceLedger<ProductCostRow>
        resource="product-costs"
        title={t('finance.productCostEntries')}
        fields={fields}
        columns={columns}
        empty={{ product: '', month: now.getMonth() + 1, year: now.getFullYear(), payrollAllocation: 0, infrastructureAllocation: 0, toolingAllocation: 0, monthlyRevenue: 0 }}
        toForm={(r) => ({ product: r.product, month: r.month, year: r.year, payrollAllocation: r.payrollAllocation ?? 0, infrastructureAllocation: r.infrastructureAllocation ?? 0, toolingAllocation: r.toolingAllocation ?? 0, monthlyRevenue: r.monthlyRevenue ?? 0 })}
        rowLabel={(r) => `${productName.get(r.product) ?? t('common.product')} · ${r.year}-${String(r.month).padStart(2, '0')}`}
        invalidateKeys={['fin-products', 'fin-exec']}
      />
    </div>
  );
}
