import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIncidents, useIncident, useIncidentMutations } from '@/api/hooks';
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
import { formatRelative, formatDate } from '@/lib/utils';
import { useCan } from '@/lib/permissions';
import type { Incident } from '@/types';

const SEV = { SEV1: 'danger', SEV2: 'warning', SEV3: 'default', SEV4: 'secondary' } as const;
const EMPTY = { title: '', description: '', severity: 'SEV3' };

export default function Incidents() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [tlMsg, setTlMsg] = useState('');

  const { t } = useTranslation();
  const { data, isLoading, isError, error: qErr } = useIncidents({ page, limit: 10, search: search || undefined, severity: severity || undefined });
  const detail = useIncident(selected ?? undefined);
  const { create, update, remove, addTimeline } = useIncidentMutations();
  const del = useRowDelete(remove);
  const canDelete = useCan('head_of_engineering');

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (i: Incident) => {
    setEditing(i);
    setForm({ title: i.title, description: i.description ?? '', severity: i.severity });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await update.mutateAsync({ id: editing._id, body: form });
      else await create.mutateAsync(form);
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader title={t('pages.incidents.title')} subtitle={t('pages.incidents.subtitle')} action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.create')}</Button>} />
      <IntegrationNotice sources={['pagerduty']} />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <FilterSelect value={severity} onChange={(v) => { setSeverity(v); setPage(1); }} all={t('common.allSeverities')} options={['SEV1', 'SEV2', 'SEV3', 'SEV4'].map((s) => ({ value: s, label: s }))} />
      </div>

      <Card>
        {isLoading ? <LoadingState /> : isError ? <ErrorState message={apiError(qErr)} /> : !data?.data.length ? <EmptyState /> : (
          <>
            <Table>
              <THead><TR><TH>{t('incidents.incident')}</TH><TH>{t('incidents.severity')}</TH><TH>{t('common.status')}</TH><TH>{t('common.detected')}</TH><TH>MTTR</TH><TH className="text-right">{t('common.edit')}</TH></TR></THead>
              <TBody>
                {data.data.map((i: Incident) => (
                  <TR key={i._id} className="cursor-pointer" onClick={() => setSelected(i._id)}>
                    <TD className="font-medium">{i.title}</TD>
                    <TD><Badge variant={SEV[i.severity]}>{i.severity}</Badge></TD>
                    <TD className="text-muted-foreground">{t(`incidents.statuses.${i.status}`)}</TD>
                    <TD className="text-muted-foreground">{formatRelative(i.detectedAt)}</TD>
                    <TD className="text-muted-foreground">{i.mttrMinutes ? `${i.mttrMinutes}m` : '—'}</TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <RowActions onEdit={() => openEdit(i)} onDelete={canDelete ? () => del.ask(i._id, i.title) : undefined} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Detail with timeline + status control */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={detail.data?.title ?? t('incidents.incident')} className="max-w-2xl">
        {detail.isLoading ? <LoadingState /> : detail.data ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge variant={SEV[detail.data.severity]}>{detail.data.severity}</Badge>
              <Select
                className="w-auto"
                value={detail.data.status}
                onChange={(e) => update.mutate({ id: detail.data!._id, body: { status: e.target.value } })}
              >
                {['open', 'investigating', 'identified', 'monitoring', 'mitigated', 'resolved'].map((s) => <option key={s} value={s}>{t(`incidents.statuses.${s}`)}</option>)}
              </Select>
            </div>
            {detail.data.description && <p className="text-sm text-muted-foreground">{detail.data.description}</p>}

            <div>
              <h4 className="mb-2 text-sm font-semibold">{t('incidents.timeline')}</h4>
              <ol className="space-y-3 border-l pl-4">
                {detail.data.timeline?.map((entry) => (
                  <li key={entry._id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm">{entry.message}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDate(entry.at)} · {entry.type}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex gap-2">
                <Input value={tlMsg} onChange={(e) => setTlMsg(e.target.value)} placeholder={t('incidents.addUpdate')} />
                <Button
                  disabled={!tlMsg || addTimeline.isPending}
                  onClick={async () => { await addTimeline.mutateAsync({ id: detail.data!._id, body: { message: tlMsg, type: 'update' } }); setTlMsg(''); }}
                >
                  {t('common.add')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.title}` : t('incidents.declare')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('incidents.title')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t('incidents.severity')}</Label><Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{['SEV1', 'SEV2', 'SEV3', 'SEV4'].map((s) => <option key={s}>{s}</option>)}</Select></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('incidents.declare')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
