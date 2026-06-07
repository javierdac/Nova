import { useState } from 'react';
import { Plus, Download, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCloudAnalytics, useFinanceList, useFinanceMutations } from '@/api/finance';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { FinChartCard, CostBar, CostLine, PALETTE } from '@/components/charts/FinanceCharts';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

const PROVIDERS = ['AWS', 'GCP', 'Azure', 'Cloudflare', 'MongoDB Atlas', 'Vercel', 'Railway'];

interface CloudRow { _id: string; provider: string; service: string; month: number; year: number; amount: number; notes?: string }

export default function CloudCosts() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CloudRow | null>(null);
  const [error, setError] = useState('');
  const now = new Date();
  const EMPTY = { provider: 'AWS', service: '', month: now.getMonth() + 1, year: now.getFullYear(), amount: 0 };
  const [form, setForm] = useState(EMPTY);

  const analytics = useCloudAnalytics();
  const list = useFinanceList<CloudRow>('cloud-costs', { page, limit: 10 });
  const { create, update, remove } = useFinanceMutations('cloud-costs');
  const del = useRowDelete(remove);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (c: CloudRow) => {
    setEditing(c);
    setForm({ provider: c.provider, service: c.service, month: c.month, year: c.year, amount: c.amount });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, amount: Number(form.amount), month: Number(form.month), year: Number(form.year) };
    try {
      if (editing) await update.mutateAsync({ id: editing._id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('pages.cloudCosts.title')}
        subtitle={t('pages.cloudCosts.subtitle')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV('cloud-costs', (list.data?.data ?? []) as unknown as Record<string, unknown>[])}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.add')}</Button>
          </div>
        }
      />
      <IntegrationNotice sources={['cloud']} />

      {analytics.data?.alerts.map((a) => (
        <Card key={a.message} className="mb-4 border-amber-500/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-amber-500"><AlertTriangle className="h-4 w-4" />{a.message}</CardContent>
        </Card>
      ))}

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinChartCard title={t('finance.costByProvider', { defaultValue: 'Spend by Provider' })}>
          {analytics.isLoading ? <div /> : <CostBar data={analytics.data?.byProvider ?? []} dataKey="total" nameKey="provider" />}
        </FinChartCard>
        <FinChartCard title={t('finance.monthlyTrend')}>
          {analytics.isLoading ? <div /> : <CostLine data={analytics.data?.trend ?? []} keys={[{ key: 'total', color: PALETTE[0] }]} />}
        </FinChartCard>
      </section>

      <Card>
        {list.isLoading ? <LoadingState /> : list.isError ? <ErrorState message={apiError(list.error)} /> : !list.data?.data.length ? <EmptyState /> : (
          <>
            <Table>
              <THead><TR><TH>{t('common.provider')}</TH><TH>{t('common.service')}</TH><TH>{t('common.period')}</TH><TH>{t('common.amount')}</TH><TH className="text-right">{t('common.edit')}</TH></TR></THead>
              <TBody>
                {list.data.data.map((c) => (
                  <TR key={c._id}>
                    <TD><Badge variant="secondary">{c.provider}</Badge></TD>
                    <TD>{c.service}</TD>
                    <TD className="text-muted-foreground">{c.year}-{String(c.month).padStart(2, '0')}</TD>
                    <TD className="font-medium">{formatUSD(c.amount)}</TD>
                    <TD><RowActions onEdit={() => openEdit(c)} onDelete={() => del.ask(c._id, `${c.provider} · ${c.service}`)} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={list.data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.service}` : t('pages.cloudCosts.title')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('common.provider')}</Label><Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('common.service')}</Label><Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{t('finance.month')}</Label><Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('finance.year')}</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('common.amount')}</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
