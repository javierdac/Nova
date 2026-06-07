import { useState } from 'react';
import { Plus, Briefcase, Clock, DollarSign, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHeadcount, useFunnel, usePositions, usePositionMutations, useAddCandidate } from '@/api/org';
import { useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { Position, Team } from '@/types';

const STATUS_TONE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  planned: 'secondary', open: 'warning', interviewing: 'default', offer: 'success', filled: 'success', frozen: 'danger',
};
const EMPTY = { title: '', team: '', seniority: 'mid', status: 'open', budgetedMonthlyCost: 9000 };

export default function Headcount() {
  const { t } = useTranslation();
  const headcount = useHeadcount();
  const funnel = useFunnel();
  const positions = usePositions({ limit: 50 });
  const teams = useTeams({ limit: 50 });
  const { create, update, remove } = usePositionMutations();
  const addCandidate = useAddCandidate();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('head_of_engineering');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const CAND_EMPTY = { name: '', stage: 'applied', note: '' };
  const [candPosition, setCandPosition] = useState<Position | null>(null);
  const [candForm, setCandForm] = useState(CAND_EMPTY);
  const [candError, setCandError] = useState('');

  const openCandidate = (p: Position) => { setCandPosition(p); setCandForm(CAND_EMPTY); setCandError(''); };
  const submitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandError('');
    const body = { ...candForm, note: candForm.note || undefined };
    try {
      await addCandidate.mutateAsync({ id: candPosition!._id, body });
      setCandPosition(null);
    } catch (err) {
      setCandError(apiError(err));
    }
  };

  if (headcount.isLoading || positions.isLoading) return <LoadingState />;
  if (headcount.isError) return <ErrorState message={apiError(headcount.error)} />;

  const teamName = (id?: string) => (teams.data?.data as Team[] | undefined)?.find((t) => t._id === id)?.name ?? '—';
  const maxStage = Math.max(1, ...(funnel.data?.byStage ?? []).map((s) => s.count));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({ title: p.title, team: p.team ?? '', seniority: p.seniority ?? 'mid', status: p.status, budgetedMonthlyCost: p.budgetedMonthlyCost ?? 0 });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, budgetedMonthlyCost: Number(form.budgetedMonthlyCost), team: form.team || undefined };
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
        title={t('pages.headcount.title')}
        subtitle={t('pages.headcount.subtitle')}
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('org.newReq')}</Button>}
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('org.currentHeadcount')} value={headcount.data?.totals.actual ?? 0} icon={Briefcase} />
        <StatCard label={t('org.openReqs')} value={funnel.data?.openReqs ?? headcount.data?.totals.open ?? 0} icon={Plus} tone="warning" />
        <StatCard label={t('org.avgTimeToFill')} value={`${funnel.data?.avgTimeToFillDays ?? 0}${t('org.daysShort')}`} icon={Clock} />
        <StatCard label={t('org.openReqBudget')} value={`$${(headcount.data?.totals.openBudgetMonthly ?? 0).toLocaleString()}${t('org.perMonthShort')}`} icon={DollarSign} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('org.planVsActual')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>{t('common.team')}</TH><TH>{t('org.actual')}</TH><TH>{t('org.open')}</TH><TH>{t('org.planned')}</TH><TH>{t('org.budgetMonth')}</TH></TR></THead>
              <TBody>
                {headcount.data?.byTeam.map((t) => (
                  <TR key={t.teamId}>
                    <TD className="font-medium">{t.team}</TD>
                    <TD>{t.actual}</TD>
                    <TD>{t.open}</TD>
                    <TD className="font-semibold">{t.planned}</TD>
                    <TD>${t.openBudgetMonthly.toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('org.hiringFunnel')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(funnel.data?.byStage ?? []).map((s) => (
              <div key={s.stage}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{t(`org.stage.${s.stage}`, { defaultValue: s.stage })}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('org.openPlannedPositions')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>{t('org.role')}</TH><TH>{t('common.team')}</TH><TH>{t('common.seniority')}</TH><TH>{t('org.pipeline')}</TH><TH>{t('org.budgetMonth')}</TH><TH>{t('common.status')}</TH>{canManage && <TH className="text-right">{t('common.edit')}</TH>}</TR></THead>
            <TBody>
              {(positions.data?.data as Position[] | undefined)?.map((p) => (
                <TR key={p._id}>
                  <TD className="font-medium">{p.title}</TD>
                  <TD className="text-muted-foreground">{teamName(p.team)}</TD>
                  <TD>{t(`org.seniorityLevel.${p.seniority}`, { defaultValue: p.seniority })}</TD>
                  <TD>{p.pipeline?.length ?? 0}</TD>
                  <TD>${(p.budgetedMonthlyCost ?? 0).toLocaleString()}</TD>
                  <TD><Badge variant={STATUS_TONE[p.status]}>{t(`org.posStatus.${p.status}`, { defaultValue: p.status })}</Badge></TD>
                  {canManage && (
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCandidate(p)} aria-label={t('org.addCandidate')}><UserPlus className="h-4 w-4" /></Button>
                        <RowActions onEdit={() => openEdit(p)} onDelete={canDelete ? () => del.ask(p._id, p.title) : undefined} />
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.title}` : t('org.newRequisition')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('org.roleTitle')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>{t('common.team')}</Label>
            <Select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
              <option value="">{t('common.unassigned')}</option>
              {(teams.data?.data as Team[] | undefined)?.map((tm) => <option key={tm._id} value={tm._id}>{tm.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('common.seniority')}</Label>
              <Select value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })}>
                {['intern', 'junior', 'mid', 'senior', 'staff', 'principal'].map((s) => <option key={s} value={s}>{t(`org.seniorityLevel.${s}`, { defaultValue: s })}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('common.status')}</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['planned', 'open', 'interviewing', 'offer', 'filled', 'frozen'].map((s) => <option key={s} value={s}>{t(`org.posStatus.${s}`, { defaultValue: s })}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>{t('org.budgetedMonthlyCost')}</Label><Input type="number" min={0} value={form.budgetedMonthlyCost} onChange={(e) => setForm({ ...form, budgetedMonthlyCost: Number(e.target.value) })} /></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.create')}</Button></div>
        </form>
      </Dialog>

      <Dialog open={!!candPosition} onClose={() => setCandPosition(null)} title={candPosition ? `${t('org.addCandidate')} — ${candPosition.title}` : t('org.addCandidate')}>
        <form onSubmit={submitCandidate} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('common.name')}</Label><Input value={candForm.name} onChange={(e) => setCandForm({ ...candForm, name: e.target.value })} required minLength={2} /></div>
          <div className="space-y-1.5"><Label>{t('org.stageLabel')}</Label>
            <Select value={candForm.stage} onChange={(e) => setCandForm({ ...candForm, stage: e.target.value })}>
              {['applied', 'screen', 'onsite', 'offer', 'hired', 'rejected'].map((s) => <option key={s} value={s}>{t(`org.stage.${s}`, { defaultValue: s })}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('common.notes')}</Label><Input value={candForm.note} onChange={(e) => setCandForm({ ...candForm, note: e.target.value })} /></div>
          {candError && <p className="text-sm text-red-400">{candError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCandPosition(null)}>{t('common.cancel')}</Button><Button type="submit" disabled={addCandidate.isPending}>{t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
