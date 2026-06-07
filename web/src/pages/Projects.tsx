import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjects, useProjectMutations } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { SearchBar, FilterSelect, Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useCan } from '@/lib/permissions';
import type { Project } from '@/types';

const HEALTH = { on_track: 'success', at_risk: 'warning', off_track: 'danger' } as const;
const PRIORITY = { low: 'secondary', medium: 'default', high: 'warning', critical: 'danger' } as const;
const EMPTY = { name: '', description: '', priority: 'medium', status: 'planned', investmentCategory: 'new_value', progress: 0, roadmapHealth: 'on_track', targetDate: '' };

export default function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const { t } = useTranslation();
  const { data, isLoading, isError, error: qErr } = useProjects({ page, limit: 10, search: search || undefined, status: status || undefined });
  const { create, update, remove } = useProjectMutations();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('engineering_manager');

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      priority: p.priority,
      status: p.status,
      investmentCategory: p.investmentCategory ?? 'new_value',
      progress: p.progress ?? 0,
      roadmapHealth: p.roadmapHealth,
      targetDate: p.targetDate ? p.targetDate.slice(0, 10) : '',
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, progress: Number(form.progress), targetDate: form.targetDate || undefined };
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
      <PageHeader title={t('pages.projects.title')} subtitle={t('pages.projects.subtitle')} action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.create')}</Button>} />
      <IntegrationNotice sources={['jira']} />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} all={t('common.allStatuses')} options={['discovery', 'planned', 'active', 'on_hold', 'completed', 'cancelled'].map((s) => ({ value: s, label: t(`projects.statuses.${s}`) }))} />
      </div>

      <Card>
        {isLoading ? <LoadingState /> : isError ? <ErrorState message={apiError(qErr)} /> : !data?.data.length ? <EmptyState /> : (
          <>
            <Table>
              <THead><TR><TH>{t('projects.project')}</TH><TH>{t('common.status')}</TH><TH>{t('common.priority')}</TH><TH>{t('projects.health')}</TH><TH>{t('common.progress')}</TH><TH>{t('common.target')}</TH>{canManage && <TH className="text-right">{t('common.edit')}</TH>}</TR></THead>
              <TBody>
                {data.data.map((p: Project) => (
                  <TR key={p._id}>
                    <TD className="font-medium">{p.key && <span className="mr-2 text-xs text-muted-foreground">{p.key}</span>}{p.name}</TD>
                    <TD className="text-muted-foreground">{t(`projects.statuses.${p.status}`)}</TD>
                    <TD><Badge variant={PRIORITY[p.priority as keyof typeof PRIORITY] ?? 'secondary'}>{t(`projects.priorities.${p.priority}`)}</Badge></TD>
                    <TD><Badge variant={HEALTH[p.roadmapHealth]}>{t(`projects.roadmapHealth.${p.roadmapHealth}`)}</Badge></TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                    </TD>
                    <TD className="text-muted-foreground">{formatDate(p.targetDate)}</TD>
                    {canManage && (
                      <TD><RowActions onEdit={() => openEdit(p)} onDelete={canDelete ? () => del.ask(p._id, p.name) : undefined} /></TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.name}` : t('pages.projects.title')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('common.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('common.priority')}</Label><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{t(`projects.priorities.${p}`)}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('common.status')}</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['discovery', 'planned', 'active', 'on_hold', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{t(`projects.statuses.${s}`)}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('investment.category')}</Label><Select value={form.investmentCategory} onChange={(e) => setForm({ ...form, investmentCategory: e.target.value })}>{['new_value', 'ktlo'].map((c) => <option key={c} value={c}>{t(`investment.cat.${c}`)}</option>)}</Select></div>
          </div>
          {editing && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>{t('common.progress')} %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>{t('projects.health')}</Label><Select value={form.roadmapHealth} onChange={(e) => setForm({ ...form, roadmapHealth: e.target.value })}>{['on_track', 'at_risk', 'off_track'].map((h) => <option key={h} value={h}>{t(`projects.roadmapHealth.${h}`)}</option>)}</Select></div>
              <div className="space-y-1.5"><Label>{t('common.target')}</Label><Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></div>
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.create')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
