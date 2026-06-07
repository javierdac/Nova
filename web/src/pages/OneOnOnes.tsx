import { useState } from 'react';
import {
  Plus, Target, Calendar, CheckCircle2, Circle, MessageSquare,
  TrendingUp, ThumbsUp, AlertTriangle, Lock, GraduationCap, Users2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useOneOnOnes, useOneOnOne, useOneOnOneMutations, useUsers } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useCan } from '@/lib/permissions';
import type { OneOnOne, OneOnOneActionItem, OneOnOneGoal, User } from '@/types';

const MOODS = ['great', 'good', 'neutral', 'concerned', 'at_risk'];
const GOAL_STATUS = ['not_started', 'in_progress', 'achieved', 'dropped'];
const moodTone = (m?: string) => (m === 'great' || m === 'good' ? 'success' : m === 'neutral' ? 'default' : 'danger');
const goalTone = (s: string) => (s === 'achieved' ? 'success' : s === 'in_progress' ? 'default' : s === 'dropped' ? 'outline' : 'secondary');
const idOf = (v: { _id?: string } | string | undefined) => (typeof v === 'object' && v ? v._id ?? '' : (v ?? ''));
const nameOf = (v: { name: string } | string | undefined) => (typeof v === 'object' && v ? v.name : '—');
const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const isFuture = (d?: string) => !!d && new Date(d).getTime() >= Date.now() - 864e5;

const EMPTY = {
  report: '', date: new Date().toISOString().slice(0, 10), mood: 'good', nextMeetingDate: '',
  notes: '', privateNotes: '', strengths: '', improvements: '', currentLevel: '', targetLevel: '', plan: '',
};

export default function OneOnOnes() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [reportFilter, setReportFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OneOnOne | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [newAction, setNewAction] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const { data, isLoading, isError, error: qErr } = useOneOnOnes({ limit: 100 });
  const users = useUsers({ limit: 100 });
  const detail = useOneOnOne(selected ?? undefined);
  const { create, update, remove } = useOneOnOneMutations();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');

  const all = (data?.data as OneOnOne[]) ?? [];

  // Aggregate the latest signal per report (list is sorted by -date).
  const people = Object.values(
    all.reduce<Record<string, { id: string; name: string; count: number; latestDate: string; latestMood?: string; nextMeeting?: string }>>((acc, o) => {
      const id = idOf(o.report);
      if (!acc[id]) acc[id] = { id, name: nameOf(o.report), count: 0, latestDate: o.date, latestMood: o.mood, nextMeeting: o.nextMeetingDate };
      acc[id].count += 1;
      if (o.nextMeetingDate && isFuture(o.nextMeetingDate)) acc[id].nextMeeting = o.nextMeetingDate;
      return acc;
    }, {}),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = reportFilter ? all.filter((o) => idOf(o.report) === reportFilter) : all;
  const pageSize = 8;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: all.length,
    people: people.length,
    upcoming: people.filter((p) => isFuture(p.nextMeeting)).length,
    atRisk: people.filter((p) => p.latestMood === 'concerned' || p.latestMood === 'at_risk').length,
  };

  const refresh = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['one-on-ones'] });
    if (id) qc.invalidateQueries({ queryKey: ['one-on-one', id] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, report: reportFilter || '' });
    setError('');
    setOpen(true);
  };
  const openEdit = (o: OneOnOne) => {
    setEditing(o);
    setForm({
      report: idOf(o.report),
      date: o.date ? o.date.slice(0, 10) : EMPTY.date,
      mood: o.mood ?? 'good',
      nextMeetingDate: o.nextMeetingDate ? o.nextMeetingDate.slice(0, 10) : '',
      notes: o.notes ?? '',
      privateNotes: o.privateNotes ?? '',
      strengths: o.feedback?.strengths ?? '',
      improvements: o.feedback?.improvements ?? '',
      currentLevel: o.careerGrowth?.currentLevel ?? '',
      targetLevel: o.careerGrowth?.targetLevel ?? '',
      plan: o.careerGrowth?.plan ?? '',
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      date: form.date || undefined,
      mood: form.mood,
      nextMeetingDate: form.nextMeetingDate || undefined,
      notes: form.notes || undefined,
      privateNotes: form.privateNotes || undefined,
      feedback: { strengths: form.strengths || undefined, improvements: form.improvements || undefined },
      careerGrowth: { currentLevel: form.currentLevel || undefined, targetLevel: form.targetLevel || undefined, plan: form.plan || undefined },
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing._id, body });
        refresh(editing._id);
      } else {
        await create.mutateAsync({ ...body, report: form.report });
        refresh();
      }
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  // ── inline edits on the detail drawer (action items + goals) ──
  const patchDetail = async (o: OneOnOne, body: Record<string, unknown>) => {
    await update.mutateAsync({ id: o._id, body });
    refresh(o._id);
  };
  const toggleAction = (o: OneOnOne, idx: number) => {
    const items = (o.actionItems ?? []).map((a, i) => ({ title: a.title, owner: a.owner, done: i === idx ? !a.done : a.done }));
    return patchDetail(o, { actionItems: items });
  };
  const addAction = (o: OneOnOne) => {
    if (!newAction.trim()) return;
    const items = [...(o.actionItems ?? []).map((a) => ({ title: a.title, owner: a.owner, done: a.done })), { title: newAction.trim(), owner: 'report' as const, done: false }];
    setNewAction('');
    return patchDetail(o, { actionItems: items });
  };
  const setGoalStatus = (o: OneOnOne, idx: number, status: string) => {
    const goals = (o.goals ?? []).map((g, i) => ({ title: g.title, description: g.description, category: g.category, status: i === idx ? status : g.status, dueDate: g.dueDate }));
    return patchDetail(o, { goals });
  };
  const addGoal = (o: OneOnOne) => {
    if (!newGoal.trim()) return;
    const goals = [...(o.goals ?? []).map((g) => ({ title: g.title, description: g.description, category: g.category, status: g.status, dueDate: g.dueDate })), { title: newGoal.trim(), category: 'performance' as const, status: 'not_started' as const }];
    setNewGoal('');
    return patchDetail(o, { goals });
  };

  const d = detail.data;

  return (
    <div>
      <PageHeader
        title={t('pages.oneOnOnes.title')}
        subtitle={t('pages.oneOnOnes.subtitle')}
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('oneOnOnes.log')}</Button>}
      />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('oneOnOnes.statLogged')} value={stats.total} icon={MessageSquare} />
        <StatCard label={t('oneOnOnes.statPeople')} value={stats.people} icon={Users2} />
        <StatCard label={t('oneOnOnes.statUpcoming')} value={stats.upcoming} sub={t('oneOnOnes.statUpcomingSub')} icon={Calendar} />
        <StatCard label={t('oneOnOnes.statAttention')} value={stats.atRisk} sub={t('oneOnOnes.statAttentionSub')} icon={AlertTriangle} tone={stats.atRisk ? 'danger' : 'success'} />
      </section>

      {isLoading ? <LoadingState /> : isError ? <ErrorState message={apiError(qErr)} /> : !all.length ? <EmptyState /> : (
        <>
          {/* People filter chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => { setReportFilter(''); setPage(1); }} className={`rounded-full border px-3 py-1 text-sm ${!reportFilter ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>
              {t('common.all')} · {all.length}
            </button>
            {people.map((p) => (
              <button key={p.id} onClick={() => { setReportFilter(p.id); setPage(1); }} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${reportFilter === p.id ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{initials(p.name)}</span>
                {p.name} · {p.count}
                {p.latestMood && <span className={`h-2 w-2 rounded-full ${p.latestMood === 'great' || p.latestMood === 'good' ? 'bg-emerald-500' : p.latestMood === 'neutral' ? 'bg-muted-foreground' : 'bg-red-500'}`} />}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {paged.map((o) => (
              <Card key={o._id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelected(o._id)}>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(nameOf(o.report))}</span>
                      <div>
                        <p className="font-medium leading-tight">{nameOf(o.report)}</p>
                        <p className="text-xs text-muted-foreground">{nameOf(o.manager)} · {formatDate(o.date)}</p>
                      </div>
                      {o.mood && <Badge variant={moodTone(o.mood)}>{t(`oneOnOnes.moods.${o.mood}`)}</Badge>}
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {o.nextMeetingDate && <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Calendar className="h-3 w-3" /> {formatDate(o.nextMeetingDate)}</span>}
                      {canManage && <RowActions onEdit={() => openEdit(o)} onDelete={() => del.ask(o._id, t('oneOnOnes.deleteLabel', { name: nameOf(o.report) }))} />}
                    </div>
                  </div>
                  {o.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{o.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {!!o.goals?.length && <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {t('oneOnOnes.goalsCount', { count: o.goals.length })}</span>}
                    {!!o.actionItems?.length && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t('oneOnOnes.actionsCount', { done: o.actionItems.filter((a) => a.done).length, total: o.actionItems.length })}</span>}
                    {o.careerGrowth?.targetLevel && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> → {o.careerGrowth.targetLevel}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination meta={{ total: filtered.length, page, limit: pageSize, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)), hasNextPage: page * pageSize < filtered.length, hasPrevPage: page > 1 }} onPage={setPage} />
        </>
      )}

      {/* Detail drawer */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={d ? `1:1 · ${nameOf(d.report)}` : t('nav.oneOnOnes')} className="max-w-2xl">
        {detail.isLoading ? <LoadingState /> : d ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{nameOf(d.manager)} → {nameOf(d.report)}</span>
                <span>·</span>
                <span>{formatDate(d.date)}</span>
                {d.mood && <Badge variant={moodTone(d.mood)}>{t(`oneOnOnes.moods.${d.mood}`)}</Badge>}
              </div>
              {canManage && <Button variant="outline" size="sm" onClick={() => { setSelected(null); openEdit(d); }}>{t('common.edit')}</Button>}
            </div>

            {d.notes && (
              <div>
                <h4 className="mb-1 text-sm font-semibold">{t('common.notes')}</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{d.notes}</p>
              </div>
            )}

            {d.privateNotes && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <h4 className="mb-1 flex items-center gap-1 text-sm font-semibold text-amber-600"><Lock className="h-3.5 w-3.5" /> {t('oneOnOnes.privateNotes')}</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{d.privateNotes}</p>
              </div>
            )}

            {(d.feedback?.strengths || d.feedback?.improvements) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {d.feedback?.strengths && (
                  <div className="rounded-md border p-3">
                    <h4 className="mb-1 flex items-center gap-1 text-sm font-semibold text-emerald-500"><ThumbsUp className="h-3.5 w-3.5" /> {t('oneOnOnes.strengths')}</h4>
                    <p className="text-sm text-muted-foreground">{d.feedback.strengths}</p>
                  </div>
                )}
                {d.feedback?.improvements && (
                  <div className="rounded-md border p-3">
                    <h4 className="mb-1 flex items-center gap-1 text-sm font-semibold text-amber-500"><TrendingUp className="h-3.5 w-3.5" /> {t('oneOnOnes.toImprove')}</h4>
                    <p className="text-sm text-muted-foreground">{d.feedback.improvements}</p>
                  </div>
                )}
              </div>
            )}

            {(d.careerGrowth?.currentLevel || d.careerGrowth?.targetLevel || d.careerGrowth?.plan) && (
              <div className="rounded-md border p-3">
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold"><GraduationCap className="h-3.5 w-3.5 text-primary" /> {t('oneOnOnes.careerGrowth')}</h4>
                {(d.careerGrowth?.currentLevel || d.careerGrowth?.targetLevel) && (
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{d.careerGrowth?.currentLevel || '—'}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="default">{d.careerGrowth?.targetLevel || '—'}</Badge>
                  </div>
                )}
                {d.careerGrowth?.plan && <p className="text-sm text-muted-foreground">{d.careerGrowth.plan}</p>}
              </div>
            )}

            {/* Goals */}
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold"><Target className="h-3.5 w-3.5 text-primary" /> {t('oneOnOnes.goals')}</h4>
              <div className="space-y-2">
                {(d.goals ?? []).map((g: OneOnOneGoal, i) => (
                  <div key={g._id ?? i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{g.title}</p>
                      <p className="text-xs text-muted-foreground">{t(`oneOnOnes.goalCategory.${g.category}`, { defaultValue: g.category })}</p>
                    </div>
                    {canManage ? (
                      <Select className="h-8 w-auto py-1 leading-none" value={g.status} onChange={(e) => setGoalStatus(d, i, e.target.value)}>
                        {GOAL_STATUS.map((s) => <option key={s} value={s}>{t(`oneOnOnes.goalStatus.${s}`, { defaultValue: s.replace(/_/g, ' ') })}</option>)}
                      </Select>
                    ) : <Badge variant={goalTone(g.status)}>{t(`oneOnOnes.goalStatus.${g.status}`, { defaultValue: g.status.replace(/_/g, ' ') })}</Badge>}
                  </div>
                ))}
                {!d.goals?.length && <p className="text-xs text-muted-foreground">{t('oneOnOnes.noGoals')}</p>}
                {canManage && (
                  <div className="flex gap-2">
                    <Input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder={t('oneOnOnes.addGoal')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(d); } }} />
                    <Button type="button" variant="outline" onClick={() => addGoal(d)} disabled={!newGoal.trim()}>{t('common.add')}</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action items */}
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t('oneOnOnes.actionItems')}</h4>
              <div className="space-y-1.5">
                {(d.actionItems ?? []).map((a: OneOnOneActionItem, i) => (
                  <button key={a._id ?? i} type="button" disabled={!canManage} onClick={() => toggleAction(d, i)} className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent">
                    {a.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className={a.done ? 'text-muted-foreground line-through' : ''}>{a.title}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{t(`oneOnOnes.owner.${a.owner}`, { defaultValue: a.owner })}</Badge>
                  </button>
                ))}
                {!d.actionItems?.length && <p className="text-xs text-muted-foreground">{t('oneOnOnes.noActionItems')}</p>}
                {canManage && (
                  <div className="flex gap-2 pt-1">
                    <Input value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder={t('oneOnOnes.addActionItem')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAction(d); } }} />
                    <Button type="button" variant="outline" onClick={() => addAction(d)} disabled={!newAction.trim()}>{t('common.add')}</Button>
                  </div>
                )}
              </div>
            </div>

            {d.nextMeetingDate && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {t('oneOnOnes.nextMeeting')} <span className="font-medium text-foreground">{formatDate(d.nextMeetingDate)}</span></p>
            )}
          </div>
        ) : null}
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} · ${nameOf(editing.report)}` : t('oneOnOnes.log')} className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <div className="space-y-1.5">
              <Label>{t('oneOnOnes.report')}</Label>
              <Select value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })} required>
                <option value="">{t('oneOnOnes.select')}</option>
                {users.data?.data.map((u: User) => <option key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</option>)}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{t('common.date')}</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('common.mood')}</Label><Select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>{MOODS.map((m) => <option key={m} value={m}>{t(`oneOnOnes.moods.${m}`)}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('oneOnOnes.next')}</Label><Input type="date" value={form.nextMeetingDate} onChange={(e) => setForm({ ...form, nextMeetingDate: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t('oneOnOnes.sharedNotes')}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('oneOnOnes.sharedNotesPh')} /></div>
          <div className="space-y-1.5"><Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> {t('oneOnOnes.privateNotesManager')}</Label><Textarea value={form.privateNotes} onChange={(e) => setForm({ ...form, privateNotes: e.target.value })} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t('oneOnOnes.strengths')}</Label><Textarea value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('oneOnOnes.areasToImprove')}</Label><Textarea value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('oneOnOnes.currentLevel')}</Label><Input value={form.currentLevel} onChange={(e) => setForm({ ...form, currentLevel: e.target.value })} placeholder={t('oneOnOnes.currentLevelPh')} /></div>
            <div className="space-y-1.5"><Label>{t('oneOnOnes.targetLevel')}</Label><Input value={form.targetLevel} onChange={(e) => setForm({ ...form, targetLevel: e.target.value })} placeholder={t('oneOnOnes.targetLevelPh')} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t('oneOnOnes.growthPlan')}</Label><Textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{t('common.save')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
