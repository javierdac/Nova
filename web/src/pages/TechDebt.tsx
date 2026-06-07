import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTechDebt, useTechDebtMatrix, useTechDebtMutations } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { TechDebt } from '@/types';

const QUADRANTS = [
  { key: 'quick_win', tone: 'success' as const },
  { key: 'major_project', tone: 'warning' as const },
  { key: 'fill_in', tone: 'default' as const },
  { key: 'thankless', tone: 'danger' as const },
];
const CATEGORIES = ['architecture', 'code_quality', 'testing', 'infrastructure', 'security', 'documentation', 'dependencies'];
const EMPTY = { title: '', description: '', category: 'code_quality', impactScore: 5, riskScore: 5, effortScore: 5 };

export default function TechDebtPage() {
  const [tab, setTab] = useState<'list' | 'matrix'>('matrix');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TechDebt | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const { t } = useTranslation();
  const matrix = useTechDebtMatrix();
  const list = useTechDebt({ page, limit: 10 });
  const { create, update, remove } = useTechDebtMutations();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('head_of_engineering');

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (d: TechDebt) => {
    setEditing(d);
    setForm({ title: d.title, description: d.description ?? '', category: d.category, impactScore: d.impactScore, riskScore: d.riskScore, effortScore: d.effortScore });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, impactScore: Number(form.impactScore), riskScore: Number(form.riskScore), effortScore: Number(form.effortScore) };
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
        title={t('pages.techDebt.title')}
        subtitle={t('pages.techDebt.subtitle')}
        action={
          <div className="flex gap-2">
            <div className="flex rounded-md border p-0.5">
              <button onClick={() => setTab('matrix')} className={`rounded px-3 py-1 text-sm ${tab === 'matrix' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('techDebt.tabs.matrix')}</button>
              <button onClick={() => setTab('list')} className={`rounded px-3 py-1 text-sm ${tab === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('techDebt.tabs.list')}</button>
            </div>
            {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('techDebt.addItem')}</Button>}
          </div>
        }
      />

      {tab === 'matrix' ? (
        matrix.isLoading ? <LoadingState /> : matrix.isError ? <ErrorState message={apiError(matrix.error)} /> : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {QUADRANTS.map((q) => (
              <Card key={q.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t(`techDebt.quadrants.${q.key}`)}</CardTitle>
                    <Badge variant={q.tone}>{matrix.data?.quadrants[q.key]?.length ?? 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`techDebt.quadrantHints.${q.key}`)}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {matrix.data?.quadrants[q.key]?.length ? matrix.data.quadrants[q.key].map((d) => (
                    <div key={d._id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="truncate">{d.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">P {d.priorityScore} · R {d.riskScore}</span>
                    </div>
                  )) : <p className="py-4 text-center text-xs text-muted-foreground">{t('techDebt.empty')}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          {list.isLoading ? <LoadingState /> : !list.data?.data.length ? <EmptyState /> : (
            <>
              <Table>
                <THead><TR><TH>{t('techDebt.item')}</TH><TH>{t('common.category')}</TH><TH>{t('common.impact')}</TH><TH>{t('common.risk')}</TH><TH>{t('common.effort')}</TH><TH>{t('common.priorityScore')}</TH><TH>{t('techDebt.quadrant')}</TH>{canManage && <TH className="text-right">{t('common.edit')}</TH>}</TR></THead>
                <TBody>
                  {list.data.data.map((d: TechDebt) => (
                    <TR key={d._id}>
                      <TD className="font-medium">{d.title}</TD>
                      <TD className="text-muted-foreground">{t(`techDebt.categories.${d.category}`)}</TD>
                      <TD>{d.impactScore}</TD><TD>{d.riskScore}</TD><TD>{d.effortScore}</TD>
                      <TD className="font-semibold">{d.priorityScore}</TD>
                      <TD><Badge variant="secondary">{t(`techDebt.quadrants.${d.quadrant}`)}</Badge></TD>
                      {canManage && <TD><RowActions onEdit={() => openEdit(d)} onDelete={canDelete ? () => del.ask(d._id, d.title) : undefined} /></TD>}
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pagination meta={list.data.meta} onPage={setPage} />
            </>
          )}
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.title}` : t('techDebt.addItem')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('incidents.title')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t('common.category')}</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`techDebt.categories.${c}`)}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['impactScore', 'riskScore', 'effortScore'] as const).map((f) => (
              <div key={f} className="space-y-1.5">
                <Label>{t(`common.${f === 'impactScore' ? 'impact' : f === 'riskScore' ? 'risk' : 'effort'}`)} (1-10)</Label>
                <Input type="number" min={1} max={10} value={form[f]} onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
