import { useState } from 'react';
import { Plus, Download, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToolAnalytics, useFinanceMutations, type ToolRow } from '@/api/finance';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import { exportToCSV, formatUSD } from '@/lib/export';

const CATEGORIES = ['communication', 'source_control', 'observability', 'design', 'project_mgmt', 'docs', 'security', 'other'];
const EMPTY = { toolName: '', category: 'other', monthlyCost: 0, activeLicenses: 0, usedLicenses: 0 };

export default function SaaSCosts() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useToolAnalytics();
  const { create, update, remove } = useFinanceMutations('tool-costs');
  const del = useRowDelete(remove);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ToolRow | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(''); setOpen(true); };
  const openEdit = (tool: ToolRow) => {
    setEditing(tool);
    setForm({ toolName: tool.toolName, category: tool.category, monthlyCost: tool.monthlyCost, activeLicenses: tool.activeLicenses, usedLicenses: tool.usedLicenses });
    setFormError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const body = {
      ...form,
      monthlyCost: Number(form.monthlyCost),
      activeLicenses: Number(form.activeLicenses),
      usedLicenses: Number(form.usedLicenses),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing._id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  return (
    <div>
      <PageHeader
        title={t('pages.saasCosts.title')}
        subtitle={t('pages.saasCosts.subtitle')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV('saas-costs', d.tools as unknown as Record<string, unknown>[])}><Download className="h-4 w-4" /> {t('common.exportCsv')}</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.add')}</Button>
          </div>
        }
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('finance.totalMonthlySpend')} value={formatUSD(d.summary.totalMonthly)} />
        <StatCard label={t('finance.wastedPerMonth')} value={formatUSD(d.summary.totalWastedMonthly)} tone="warning" icon={TrendingDown} />
        <StatCard label={t('finance.potentialAnnualSavings')} value={formatUSD(d.summary.potentialAnnualSavings)} tone="success" />
        <StatCard label={t('finance.underusedTools')} value={d.summary.underusedCount} tone={d.summary.underusedCount > 0 ? 'danger' : 'success'} />
      </section>

      <Card>
        <Table>
          <THead><TR><TH>{t('common.name')}</TH><TH>{t('common.category')}</TH><TH>{t('common.monthly')}</TH><TH>{t('common.licenses')}</TH><TH>{t('common.utilization')}</TH><TH>{t('common.wasted')}</TH><TH className="text-right">{t('common.edit')}</TH></TR></THead>
          <TBody>
            {d.tools.map((tool) => (
              <TR key={tool._id}>
                <TD className="font-medium">{tool.toolName}</TD>
                <TD className="capitalize text-muted-foreground">{tool.category.replace(/_/g, ' ')}</TD>
                <TD>{formatUSD(tool.monthlyCost)}</TD>
                <TD className="text-muted-foreground">{tool.usedLicenses}/{tool.activeLicenses}</TD>
                <TD>
                  <Badge variant={tool.utilization >= 80 ? 'success' : tool.utilization >= 50 ? 'warning' : 'danger'}>{tool.utilization}%</Badge>
                </TD>
                <TD className={tool.wastedMonthlySpend > 0 ? 'font-medium text-amber-500' : 'text-muted-foreground'}>{formatUSD(tool.wastedMonthlySpend)}</TD>
                <TD><RowActions onEdit={() => openEdit(tool)} onDelete={() => del.ask(tool._id, tool.toolName)} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      {!!d.underused.length && (
        <Card className="mt-4 border-amber-500/30">
          <CardContent className="p-4 text-sm">
            <p className="mb-2 font-semibold text-amber-500">{t('finance.savingsOpportunity')}</p>
            <p className="text-muted-foreground">
              {t('finance.savingsText', { count: d.summary.underusedCount, amount: formatUSD(d.summary.potentialAnnualSavings) })}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.toolName}` : t('pages.saasCosts.title')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('finance.toolName')}</Label><Input value={form.toolName} onChange={(e) => setForm({ ...form, toolName: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>{t('common.category')}</Label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{t('finance.monthlyCost')}</Label><Input type="number" min={0} value={form.monthlyCost} onChange={(e) => setForm({ ...form, monthlyCost: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('finance.active')}</Label><Input type="number" min={0} value={form.activeLicenses} onChange={(e) => setForm({ ...form, activeLicenses: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('finance.used')}</Label><Input type="number" min={0} value={form.usedLicenses} onChange={(e) => setForm({ ...form, usedLicenses: Number(e.target.value) })} /></div>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
