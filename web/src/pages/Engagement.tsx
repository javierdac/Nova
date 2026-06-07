import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEngagement, useCreatePulse } from '@/api/leadership';
import { useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { ChartCard, TrendLine } from '@/components/charts/Charts';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import type { Team } from '@/types';

const DIMS = ['workload', 'clarity', 'growth', 'management'] as const;
const currentPeriod = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

const enpsTone = (n: number) => (n >= 30 ? 'success' : n >= 0 ? 'warning' : 'danger');

export default function Engagement() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useEngagement();
  const { data: teams } = useTeams({ limit: 100 });
  const create = useCreatePulse();

  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    team: '',
    period: currentPeriod(),
    recommendScore: 8,
    workload: 6,
    clarity: 7,
    growth: 7,
    management: 8,
    comment: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await create.mutateAsync({
        team: form.team || undefined,
        period: form.period,
        recommendScore: Number(form.recommendScore),
        dimensions: {
          workload: Number(form.workload),
          clarity: Number(form.clarity),
          growth: Number(form.growth),
          management: Number(form.management),
        },
        comment: form.comment || undefined,
      });
      setOpen(false);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;
  const trendData = d.trend.map((p) => ({ date: p.period, enps: p.enps }));

  return (
    <div>
      <PageHeader
        title={t('pages.engagement.title')}
        subtitle={t('pages.engagement.subtitle')}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('engagement.addResponse')}</Button>}
      />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`eNPS · ${d.period ?? '—'}`} value={d.enps} tone={enpsTone(d.enps)} />
        <StatCard label={t('engagement.responses')} value={d.responses} />
        <StatCard label={t('engagement.promoters')} value={d.breakdown.promoters} tone="success" />
        <StatCard label={t('engagement.detractors')} value={d.breakdown.detractors} tone={d.breakdown.detractors > 0 ? 'danger' : 'success'} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="text-sm font-medium">{t('engagement.byDimension')}</h3>
            {d.dimensions.map((dim) => (
              <div key={dim.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{t(`engagement.dim.${dim.key}`)}</span>
                  <span className="text-muted-foreground">{dim.avg} / 10</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${dim.avg * 10}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <ChartCard title={t('engagement.trendTitle')}>
          <TrendLine data={trendData} dataKey="enps" />
        </ChartCard>
      </section>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>{t('common.team')}</TH>
              <TH className="text-right">eNPS</TH>
              <TH className="text-right">{t('engagement.responses')}</TH>
              <TH className="text-right">{t('engagement.promoters')}</TH>
              <TH className="text-right">{t('engagement.detractors')}</TH>
            </TR>
          </THead>
          <TBody>
            {d.byTeam.map((row) => (
              <TR key={row.team}>
                <TD className="font-medium">{row.team}</TD>
                <TD className="text-right">{row.enps}</TD>
                <TD className="text-right">{row.responses}</TD>
                <TD className="text-right">{row.promoters}</TD>
                <TD className="text-right">{row.detractors}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={t('engagement.addResponse')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('common.team')}</Label>
              <Select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                <option value="">{t('common.unassigned')}</option>
                {teams?.data.map((tm: Team) => <option key={tm._id} value={tm._id}>{tm.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('common.period')} (YYYY-MM)</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('engagement.recommend')} (0–10)</Label>
            <Input type="number" min={0} max={10} value={form.recommendScore} onChange={(e) => setForm({ ...form, recommendScore: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DIMS.map((dim) => (
              <div key={dim} className="space-y-1.5">
                <Label>{t(`engagement.dim.${dim}`)} (1–10)</Label>
                <Input type="number" min={1} max={10} value={form[dim]} onChange={(e) => setForm({ ...form, [dim]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div className="space-y-1.5"><Label>{t('common.notes')}</Label><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={create.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
