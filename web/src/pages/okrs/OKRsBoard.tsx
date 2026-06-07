import { useState } from 'react';
import { Plus, Target, TrendingUp, AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useObjectives, useOkrRollup, useObjectiveMutations } from '@/api/okrs';
import { useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { InfoHint } from '@/components/ui/tooltip';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { Objective, KeyResult, Team } from '@/types';

const QUARTER = '2026-Q2';
const STATUS_TONE = { on_track: 'success', at_risk: 'warning', off_track: 'danger', achieved: 'default' } as const;
const teamLabel = (t?: { name: string } | string) => (typeof t === 'object' && t ? t.name : undefined);
const ownerLabel = (o?: { name: string } | string) => (typeof o === 'object' && o ? o.name : undefined);
const EMPTY = { title: '', level: 'team', team: '', krTitle: '', targetValue: 100, currentValue: 0, confidence: 70 };

function Progress({ value, tone = 'bg-primary' }: { value: number; tone?: string }) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function OKRsBoard() {
  const { t } = useTranslation();
  const list = useObjectives({ quarter: QUARTER, limit: 50 });
  const rollup = useOkrRollup(QUARTER);
  const teams = useTeams({ limit: 50 });
  const { create, update, remove, addKeyResult, updateKeyResult } = useObjectiveMutations();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('head_of_engineering');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  // Key-result editor (update an existing KR or add a new one to an objective).
  const KR_EMPTY = { objId: '', krId: '', title: '', targetValue: 100, currentValue: 0, confidence: 70 };
  const [krOpen, setKrOpen] = useState(false);
  const [krForm, setKrForm] = useState(KR_EMPTY);
  const [krError, setKrError] = useState('');

  const openKr = (objId: string, kr?: KeyResult) => {
    setKrForm(
      kr
        ? { objId, krId: kr._id ?? '', title: kr.title, targetValue: kr.targetValue, currentValue: kr.currentValue ?? 0, confidence: kr.confidence ?? 70 }
        : { ...KR_EMPTY, objId },
    );
    setKrError('');
    setKrOpen(true);
  };

  const submitKr = async (e: React.FormEvent) => {
    e.preventDefault();
    setKrError('');
    const body = {
      title: krForm.title,
      targetValue: Number(krForm.targetValue),
      currentValue: Number(krForm.currentValue),
      confidence: Number(krForm.confidence),
    };
    try {
      if (krForm.krId) await updateKeyResult.mutateAsync({ id: krForm.objId, krId: krForm.krId, body });
      else await addKeyResult.mutateAsync({ id: krForm.objId, body: { ...body, metricType: 'percent', startValue: 0 } });
      setKrOpen(false);
    } catch (err) {
      setKrError(apiError(err));
    }
  };

  if (list.isLoading) return <LoadingState />;
  if (list.isError) return <ErrorState message={apiError(list.error)} />;

  const objectives = (list.data?.data as Objective[]) ?? [];

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (o: Objective) => {
    setEditing(o);
    setForm({ ...EMPTY, title: o.title, level: o.level, team: typeof o.team === 'object' ? '' : (o.team ?? '') });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await update.mutateAsync({ id: editing._id, body: { title: form.title, level: form.level, team: form.team || undefined } });
      } else {
        await create.mutateAsync({
          title: form.title,
          quarter: QUARTER,
          level: form.level,
          team: form.team || undefined,
          keyResults: form.krTitle
            ? [{ title: form.krTitle, metricType: 'percent', startValue: 0, targetValue: Number(form.targetValue), currentValue: Number(form.currentValue), confidence: Number(form.confidence) }]
            : [],
        });
      }
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('pages.okrs.title')}
        subtitle={t('pages.okrs.subtitle', { quarter: QUARTER })}
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('okrs.newObjective')}</Button>}
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('okrs.objectives')} value={rollup.data?.overall.objectives ?? objectives.length} icon={Target} />
        <StatCard label={t('okrs.avgProgress')} value={`${rollup.data?.overall.avgProgress ?? 0}%`} icon={TrendingUp} />
        <StatCard label={t('okrs.onTrack')} value={rollup.data?.overall.onTrack ?? 0} icon={TrendingUp} tone="success" />
        <StatCard label={t('okrs.atRiskOffTrack')} value={(rollup.data?.overall.atRisk ?? 0) + (rollup.data?.overall.offTrack ?? 0)} icon={AlertTriangle} tone="warning" />
      </section>

      {!objectives.length ? <EmptyState /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {objectives.map((o) => (
            <Card key={o._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{o.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS_TONE[o.status]}>{t(`okrs.statuses.${o.status}`)}</Badge>
                    {canManage && <RowActions onEdit={() => openEdit(o)} onDelete={canDelete ? () => del.ask(o._id, o.title) : undefined} />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.level === 'company' ? t('okrs.company') : teamLabel(o.team) ?? t('okrs.team')} · {ownerLabel(o.owner) ?? t('common.unassigned')} · {t('okrs.confidence', { value: o.confidence })}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{t('okrs.overall')}</span><span className="font-semibold">{o.progress}%</span></div>
                  <Progress value={o.progress} />
                </div>
                {o.keyResults.map((kr, i) => (
                  <div key={kr._id ?? i} className={canManage ? 'group/kr cursor-pointer rounded p-1 -m-1 hover:bg-muted/50' : undefined} onClick={canManage ? () => openKr(o._id, kr) : undefined}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate">{kr.title}</span>
                      <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
                        {kr.progress ?? 0}%
                        {canManage && <Pencil className="h-3 w-3 opacity-40 transition-opacity group-hover/kr:opacity-100" />}
                      </span>
                    </div>
                    <Progress value={kr.progress ?? 0} tone="bg-emerald-500" />
                  </div>
                ))}
                {canManage && (
                  <button type="button" onClick={() => openKr(o._id)} className="text-xs text-muted-foreground hover:text-foreground">
                    + {t('okrs.addKr')}
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.title}` : t('okrs.newObjective')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('okrs.objective')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('okrs.level')}</Label>
              <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="team">{t('okrs.team')}</option><option value="company">{t('okrs.company')}</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('common.team')}</Label>
              <Select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                <option value="">{t('okrs.none')}</option>
                {(teams.data?.data as Team[] | undefined)?.map((tm) => <option key={tm._id} value={tm._id}>{tm.name}</option>)}
              </Select>
            </div>
          </div>
          {!editing && (
            <>
              <div className="space-y-1.5"><Label>{t('okrs.firstKr')}</Label><Input placeholder={t('okrs.firstKrPh')} value={form.krTitle} onChange={(e) => setForm({ ...form, krTitle: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>{t('common.target')}</Label><Input type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>{t('okrs.current')}</Label><Input type="number" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>{t('okrs.confidenceLabel')} <InfoHint text={t('okrs.confidenceHelp')} /></Label><Input type="number" min={0} max={100} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></div>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.create')}</Button></div>
        </form>
      </Dialog>

      <Dialog open={krOpen} onClose={() => setKrOpen(false)} title={krForm.krId ? t('okrs.editKr') : t('okrs.addKr')}>
        <form onSubmit={submitKr} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('okrs.keyResult')}</Label><Input value={krForm.title} onChange={(e) => setKrForm({ ...krForm, title: e.target.value })} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{t('common.target')}</Label><Input type="number" value={krForm.targetValue} onChange={(e) => setKrForm({ ...krForm, targetValue: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('okrs.current')}</Label><Input type="number" value={krForm.currentValue} onChange={(e) => setKrForm({ ...krForm, currentValue: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('okrs.confidenceLabel')} <InfoHint text={t('okrs.confidenceHelp')} /></Label><Input type="number" min={0} max={100} value={krForm.confidence} onChange={(e) => setKrForm({ ...krForm, confidence: Number(e.target.value) })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">{t('okrs.progressHint')}</p>
          {krError && <p className="text-sm text-red-400">{krError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setKrOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={addKeyResult.isPending || updateKeyResult.isPending}>{t('common.save')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
