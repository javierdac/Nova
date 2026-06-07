import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInvestmentAllocation, useInvestmentTrend, type InvestmentCategory } from '@/api/investment';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { FinChartCard, CostDonut, CostLine } from '@/components/charts/FinanceCharts';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

const CATS: InvestmentCategory[] = ['new_value', 'ktlo', 'tech_debt', 'incidents'];
// Match the categories to the finance palette order for visual consistency.
const COLOR: Record<InvestmentCategory, string> = {
  new_value: '#22c55e',
  ktlo: '#f59e0b',
  tech_debt: '#a855f7',
  incidents: '#ef4444',
};

export default function Investment() {
  const { t } = useTranslation();
  const now = new Date();
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [year, setYear] = useState(now.getFullYear());

  const params = { quarter, year };
  const { data, isLoading, isError, error } = useInvestmentAllocation(params);
  const trend = useInvestmentTrend(params);

  const catLabel = (c: InvestmentCategory) => t(`investment.cat.${c}`);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const donutData = d.categories.map((c) => ({ name: catLabel(c.category), cost: c.cost }));
  const trendData = (trend.data ?? []).map((p) => ({
    period: p.label,
    new_value: p.new_value,
    ktlo: p.ktlo,
    tech_debt: p.tech_debt,
    incidents: p.incidents,
  }));

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div>
      <PageHeader
        title={t('pages.investment.title')}
        subtitle={t('pages.investment.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <Select className="h-9 w-auto" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </Select>
            <Select className="h-9 w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Button variant="outline" onClick={() => exportToCSV('investment-by-team', d.byTeam)}>
              <Download className="h-4 w-4" /> {t('common.exportCsv')}
            </Button>
          </div>
        }
      />
      <IntegrationNotice sources={['jira']} />
      <SourceNotice
        message={t('sourceNotice.investment')}
        links={[
          { to: '/projects', label: t('nav.projects') },
          { to: '/tech-debt', label: t('nav.techDebt') },
          { to: '/incidents', label: t('nav.incidents') },
        ]}
      />

      {/* Category KPI cards */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {d.categories.map((c) => (
          <Card key={c.category}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[c.category] }} />
                <span className="text-sm text-muted-foreground">{catLabel(c.category)}</span>
              </div>
              <div className="mt-2 text-2xl font-semibold">{c.pct}%</div>
              <div className="text-xs text-muted-foreground">{formatUSD(c.cost)}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('investment.splitTitle', { period: d.period.label })}>
          <CostDonut data={donutData} dataKey="cost" nameKey="name" />
        </FinChartCard>
        <FinChartCard title={t('investment.trendTitle')}>
          <CostLine data={trendData} keys={CATS.map((c) => ({ key: c, color: COLOR[c] }))} />
        </FinChartCard>
      </section>

      {/* Insights */}
      {d.insights.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <h3 className="mb-2 text-sm font-medium">{t('investment.insights')}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {d.insights.map((i, idx) => <li key={idx}>• {i}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* By team */}
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>{t('common.team')}</TH>
              {CATS.map((c) => <TH key={c} className="text-right">{catLabel(c)}</TH>)}
              <TH className="text-right">{t('common.total')}</TH>
            </TR>
          </THead>
          <TBody>
            {d.byTeam.map((row) => (
              <TR key={row.teamId}>
                <TD className="font-medium">{row.team}</TD>
                {CATS.map((c) => <TD key={c} className="text-right">{formatUSD(row[c])}</TD>)}
                <TD className="text-right font-semibold">{formatUSD(row.total)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
