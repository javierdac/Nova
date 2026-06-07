import { useState } from 'react';
import { Plus, Users2, CalendarOff, Gauge, UserPlus, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeams, useTeam, useTeamMutations, useUsers } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { Team, User } from '@/types';

/** Normalize a team's members (User[] | string[] | undefined) to an id array. */
function memberIdsOf(members?: User[] | string[]): string[] {
  if (!Array.isArray(members)) return [];
  return members.map((m) => (typeof m === 'string' ? m : m._id ?? m.id)).filter(Boolean) as string[];
}

const SIGNALS = ['morale', 'velocityConfidence', 'onCallLoad', 'attrition'] as const;
const EMPTY = { name: '', mission: '', description: '', signals: { morale: 70, velocityConfidence: 70, onCallLoad: 30, attrition: 10 } };

function HealthBadge({ band, score }: { band?: string; score?: number }) {
  const { t } = useTranslation();
  const variant = band === 'healthy' ? 'success' : band === 'at_risk' ? 'warning' : 'danger';
  return <Badge variant={variant}>{score ?? '—'}/100 · {band ? t(`teams.bands.${band}`) : 'n/a'}</Badge>;
}

export default function Teams() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useTeams({ limit: 50 });
  const { create, update, remove, assignMembers } = useTeamMutations();
  const del = useRowDelete(remove);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY);

  // Member management dialog
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersError, setMembersError] = useState('');

  const detail = useTeam(selected ?? undefined);
  const allUsers = useUsers({ limit: 200 });
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('head_of_engineering');

  const openMembers = (team: Team) => {
    setMembersTeam(team);
    setMemberIds(memberIdsOf(team.members));
    setMemberSearch('');
    setMembersError('');
  };
  const toggleMember = (id: string) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const saveMembers = async () => {
    if (!membersTeam) return;
    setMembersError('');
    try {
      await assignMembers.mutateAsync({ id: membersTeam._id, members: memberIds });
      setMembersTeam(null);
    } catch (err) {
      setMembersError(apiError(err));
    }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(''); setOpen(true); };
  const openEdit = (team: Team) => {
    setEditing(team);
    setForm({
      name: team.name,
      mission: team.mission ?? '',
      description: team.description ?? '',
      signals: { ...EMPTY.signals, ...(team.signals ?? {}) },
    });
    setFormError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing) {
        await update.mutateAsync({ id: editing._id, body: form });
      } else {
        const { signals, ...rest } = form;
        await create.mutateAsync(rest);
      }
      setOpen(false);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('pages.teams.title')}
        subtitle={t('pages.teams.subtitle')}
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.create')}</Button>}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={apiError(error)} />
      ) : !data?.data.length ? (
        <EmptyState message={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((team: Team) => (
            <Card key={team._id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelected(team._id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{team.name}</CardTitle>
                  <HealthBadge band={team.healthBand} score={team.healthScore} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{team.mission ?? t('teams.noMission')}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users2 className="h-4 w-4" />{Array.isArray(team.members) ? team.members.length : 0}</span>
                  {canManage && (
                    <RowActions
                      onEdit={() => openEdit(team)}
                      onDelete={canDelete ? () => del.ask(team._id, team.name) : undefined}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team detail drawer */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={detail.data?.name ?? t('nav.teams')} className="max-w-2xl">
        {detail.isLoading ? (
          <LoadingState />
        ) : detail.data ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{detail.data.mission}</p>
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="flex items-center gap-2 p-4"><Gauge className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{t('teams.health')}</p><p className="font-bold">{detail.data.healthScore}/100</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-2 p-4"><Users2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{t('teams.capacity')}</p><p className="font-bold">{detail.data.capacity?.availableHours ?? 0}h</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-2 p-4"><CalendarOff className="h-5 w-5 text-amber-500" /><div><p className="text-xs text-muted-foreground">{t('teams.onPto')}</p><p className="font-bold">{detail.data.capacity?.onPtoCount ?? 0}</p></div></CardContent></Card>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t('teams.members')}</h4>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => openMembers(detail.data as unknown as Team)}>
                    <UserPlus className="h-4 w-4" /> {t('teams.editMembers')}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {((detail.data.members as { _id: string; name: string }[] | undefined)?.length
                  ? (detail.data.members as { _id: string; name: string }[]).map((m) => (
                      <Badge key={m._id} variant="secondary">{m.name}</Badge>
                    ))
                  : <span className="text-sm text-muted-foreground">{t('teams.noMembers')}</span>)}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t('teams.healthSignals')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {detail.data.signals && Object.entries(detail.data.signals).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md border px-3 py-2">
                    <span className="text-muted-foreground">{t(`teams.signals.${k}`, { defaultValue: k })}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {canManage && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { const team = detail.data as unknown as Team; setSelected(null); openEdit(team); }}>{t('common.edit')}</Button>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.name}` : t('teams.createTeam')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('common.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>{t('teams.mission')}</Label><Input value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              {SIGNALS.map((s) => (
                <div key={s} className="space-y-1.5">
                  <Label>{t(`teams.signals.${s}`, { defaultValue: s })} (0-100)</Label>
                  <Input type="number" min={0} max={100} value={form.signals[s]} onChange={(e) => setForm({ ...form, signals: { ...form.signals, [s]: Number(e.target.value) } })} />
                </div>
              ))}
            </div>
          )}
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.create')}</Button>
          </div>
        </form>
      </Dialog>

      {/* Manage members */}
      <Dialog
        open={!!membersTeam}
        onClose={() => setMembersTeam(null)}
        title={`${t('teams.manageMembers')} — ${membersTeam?.name ?? ''}`}
        description={t('teams.selectedCount', { count: memberIds.length })}
      >
        <div className="space-y-3">
          <Input
            placeholder={t('teams.searchMembers')}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {allUsers.isLoading ? (
              <LoadingState />
            ) : !allUsers.data?.data.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('teams.noUsers')}</p>
            ) : (
              allUsers.data.data
                .filter((u: User) => {
                  const q = memberSearch.trim().toLowerCase();
                  return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                })
                .map((u: User) => {
                  const id = u._id ?? u.id;
                  const checked = memberIds.includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggleMember(id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${checked ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                    >
                      <span>
                        <span className="font-medium">{u.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
          {membersError && <p className="text-sm text-red-400">{membersError}</p>}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setMembersTeam(null)}>{t('common.cancel')}</Button>
            <Button type="button" onClick={saveMembers} disabled={assignMembers.isPending}>{t('common.save')}</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
