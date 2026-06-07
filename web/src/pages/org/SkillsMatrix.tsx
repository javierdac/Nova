import { useState } from 'react';
import { AlertTriangle, GraduationCap, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSkillsMatrix, useSkills, useSkillMutations, useSkillCatalog, useSkillCatalogMutations } from '@/api/org';
import { useUsers } from '@/api/hooks';
import type { Skill } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SourceNotice } from '@/components/shared/SourceNotice';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';

const LEVELS = [1, 2, 3, 4, 5];
const CATEGORIES = ['language', 'framework', 'platform', 'domain', 'soft', 'tooling'];

function Heat({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {LEVELS.map((l) => (
        <span key={l} className={`h-3 w-3 rounded-sm ${l <= Math.round(level) ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

const EMPTY = { user: '', skill: '', category: 'language', level: 3, interest: 3 };

export default function SkillsMatrix() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useSkillsMatrix();
  const users = useUsers({ limit: 200 });
  const userOpts = (users.data?.data ?? []).map((u) => ({ value: u._id ?? u.id ?? '', label: u.name }));
  const userName = new Map(userOpts.map((o) => [o.value, o.label]));

  const [page, setPage] = useState(1);
  const list = useSkills({ page, limit: 10 });
  const { create, update, remove } = useSkillMutations();
  const del = useRowDelete(remove);

  // Skill names are chosen from the org-wide catalog (managed on its own page).
  const catalog = useSkillCatalog({ limit: 200, sort: 'name' });
  const catalogItems = catalog.data?.data ?? [];
  const catalogByName = new Map(catalogItems.map((c) => [c.name, c]));
  const { create: createCatalog } = useSkillCatalogMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [newSkill, setNewSkill] = useState(false); // quick-add a skill not yet in the catalog

  const openCreate = () => { setEditing(null); setForm(EMPTY); setNewSkill(false); setFormError(''); setOpen(true); };
  const openEdit = (s: Skill) => {
    setEditing(s);
    setForm({ user: s.user, skill: s.skill, category: s.category, level: s.level, interest: s.interest });
    setNewSkill(false);
    setFormError('');
    setOpen(true);
  };

  // Picking a catalog skill also adopts its category; '__new__' switches to quick-add.
  const onSkillSelect = (value: string) => {
    if (value === '__new__') { setNewSkill(true); setForm((f) => ({ ...f, skill: '' })); return; }
    const item = catalogByName.get(value);
    setForm((f) => ({ ...f, skill: value, category: item?.category ?? f.category }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const skillName = form.skill.trim();
    if (!skillName) { setFormError(t('skills.skillRequired')); return; }
    const body = { ...form, skill: skillName, level: Number(form.level), interest: Number(form.interest) };
    try {
      // Quick-add: register the skill in the catalog first if it's new.
      if (newSkill && !catalogByName.has(skillName)) {
        await createCatalog.mutateAsync({ name: skillName, category: form.category });
      }
      if (editing) await update.mutateAsync({ id: editing._id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;

  return (
    <div>
      <PageHeader
        title={t('pages.skills.title')}
        subtitle={t('pages.skills.subtitle')}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('skills.addAssessment')}</Button>}
      />

      <SourceNotice message={t('sourceNotice.skills')} links={[{ to: '/org/skill-catalog', label: t('nav.skillCatalog') }]} />

      {data?.skills.length ? (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label={t('skills.tracked')} value={data.skills.length} icon={GraduationCap} />
            <StatCard label={t('skills.busRisks')} value={data.busFactor.atRiskCount} sub={t('skills.busRisksSub')} icon={AlertTriangle} tone={data.busFactor.atRiskCount ? 'danger' : 'success'} />
            <StatCard label={t('skills.avgExperts')} value={(data.skills.reduce((a, s) => a + s.experts, 0) / data.skills.length).toFixed(1)} icon={GraduationCap} />
          </section>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('skills.heatmap')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>{t('skills.skill')}</TH><TH>{t('common.category')}</TH><TH>{t('skills.people')}</TH><TH>{t('skills.experts')}</TH><TH>{t('skills.avgLevel')}</TH><TH>{t('common.risk')}</TH></TR></THead>
                <TBody>
                  {data.skills.map((s) => (
                    <TR key={s.skill}>
                      <TD className="font-medium">{s.skill}</TD>
                      <TD className="text-muted-foreground">{t(`skills.categories.${s.category}`, s.category)}</TD>
                      <TD>{s.people}</TD>
                      <TD>{s.experts}</TD>
                      <TD><Heat level={s.avgLevel} /></TD>
                      <TD>{s.busFactorRisk ? <Badge variant="danger">{t('skills.busFactor')}</Badge> : <Badge variant="success">{t('skills.ok')}</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState />
      )}

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">{t('skills.assessments')}</h3>
        </div>
        {list.isLoading ? <LoadingState /> : list.isError ? <ErrorState message={apiError(list.error)} /> : !list.data?.data.length ? (
          <CardContent className="p-0"><EmptyState /></CardContent>
        ) : (
          <>
            <Table>
              <THead><TR><TH>{t('common.name')}</TH><TH>{t('skills.skill')}</TH><TH>{t('common.category')}</TH><TH>{t('skills.level')}</TH><TH>{t('skills.interest')}</TH><TH className="text-right">{t('common.edit')}</TH></TR></THead>
              <TBody>
                {list.data.data.map((s) => (
                  <TR key={s._id}>
                    <TD className="font-medium">{userName.get(s.user) ?? '—'}</TD>
                    <TD>{s.skill}</TD>
                    <TD className="text-muted-foreground">{t(`skills.categories.${s.category}`, s.category)}</TD>
                    <TD><Heat level={s.level} /></TD>
                    <TD className="text-muted-foreground">{s.interest}/5</TD>
                    <TD><RowActions onEdit={() => openEdit(s)} onDelete={() => del.ask(s._id, `${userName.get(s.user) ?? ''} · ${s.skill}`)} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={list.data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.skill}` : t('skills.addAssessment')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('common.name')}</Label>
            <Select value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} required>
              <option value="">—</option>
              {userOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('skills.skill')}</Label>
              {newSkill ? (
                <Input value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} placeholder={t('skills.newSkillPlaceholder')} autoFocus required />
              ) : (
                <Select value={catalogByName.has(form.skill) || !form.skill ? form.skill : '__legacy__'} onChange={(e) => onSkillSelect(e.target.value)} required>
                  <option value="">—</option>
                  {form.skill && !catalogByName.has(form.skill) && <option value="__legacy__">{form.skill}</option>}
                  {catalogItems.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  <option value="__new__">{t('skills.newSkillOption')}</option>
                </Select>
              )}
            </div>
            <div className="space-y-1.5"><Label>{t('common.category')}</Label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={!newSkill && catalogByName.has(form.skill)}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(`skills.categories.${c}`, c)}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('skills.level')}</Label><Select value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('skills.interest')}</Label><Select value={form.interest} onChange={(e) => setForm({ ...form, interest: Number(e.target.value) })}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></div>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
