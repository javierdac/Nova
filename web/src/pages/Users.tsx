import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUsers, useUserMutations, useCompensation, useSetCompensation } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { SearchBar, FilterSelect, Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { User } from '@/types';

const ROLES = ['admin', 'cto', 'head_of_engineering', 'engineering_manager', 'engineer', 'viewer'];
const SENIORITY = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal'];
const EMPTY = { name: '', email: '', password: '', role: 'engineer', title: '', seniority: 'mid' };

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const { t } = useTranslation();

  const canManage = useCan('engineering_manager');
  const canDelete = useCan('admin');
  // Compensation mirrors finance RBAC: EM+ can read, Head of Eng+ can edit.
  const canSeeSalary = useCan('engineering_manager');
  const canEditSalary = useCan('head_of_engineering');
  const [salary, setSalary] = useState('');

  const { data, isLoading, isError, error: qErr } = useUsers({ page, limit: 10, search: search || undefined, role: role || undefined });
  const { create, update, remove } = useUserMutations();
  const setComp = useSetCompensation();
  const del = useRowDelete(remove);

  const editingId = editing?._id ?? editing?.id;
  const { data: comp } = useCompensation(editingId, !!editing && canSeeSalary);
  useEffect(() => {
    if (comp) setSalary(comp.annualSalary != null ? String(comp.annualSalary) : '');
  }, [comp]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setSalary(''); setError(''); setOpen(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, title: u.title ?? '', seniority: u.seniority ?? 'mid' });
    setSalary('');
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const { password, ...rest } = form; // email/password not updated here
        const id = editing._id ?? editing.id;
        await update.mutateAsync({ id, body: { name: rest.name, role: rest.role, title: rest.title || undefined, seniority: rest.seniority } });
        // Compensation lives behind a separate finance-gated endpoint.
        if (canEditSalary && salary.trim() !== '' && Number(salary) !== (comp?.annualSalary ?? null)) {
          await setComp.mutateAsync({ id, body: { annualSalary: Number(salary) } });
        }
      } else {
        await create.mutateAsync(form);
      }
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('pages.users.title')}
        subtitle={t('pages.users.subtitle')}
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.add')}</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <FilterSelect value={role} onChange={(v) => { setRole(v); setPage(1); }} options={ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} all={t('common.allRoles')} />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={apiError(qErr)} />
        ) : !data?.data.length ? (
          <EmptyState message={t('users.notFound')} />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>{t('common.name')}</TH>
                  <TH>{t('common.email')}</TH>
                  <TH>{t('common.role')}</TH>
                  <TH>{t('common.seniority')}</TH>
                  <TH>{t('common.status')}</TH>
                  {canManage && <TH className="text-right">{t('common.edit')}</TH>}
                </TR>
              </THead>
              <TBody>
                {data.data.map((u: User) => (
                  <TR key={u._id ?? u.id}>
                    <TD className="font-medium">{u.name}</TD>
                    <TD className="text-muted-foreground">{u.email}</TD>
                    <TD><Badge variant="secondary">{t(`roles.${u.role}`)}</Badge></TD>
                    <TD className="capitalize text-muted-foreground">{u.seniority ? t(`org.seniorityLevel.${u.seniority}`, { defaultValue: u.seniority }) : '—'}</TD>
                    <TD>{u.isActive === false ? <Badge variant="danger">{t('common.inactive')}</Badge> : <Badge variant="success">{t('common.active')}</Badge>}</TD>
                    {canManage && (
                      <TD>
                        <RowActions
                          onEdit={() => openEdit(u)}
                          onDelete={canDelete ? () => del.ask(u._id ?? u.id, u.name) : undefined}
                        />
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.name}` : t('pages.users.title')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('common.name')}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>{t('common.email')}</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label>{t('auth.password')}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('common.role')}</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('common.seniority')}</Label>
              <Select value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })}>
                {SENIORITY.map((s) => <option key={s} value={s}>{t(`org.seniorityLevel.${s}`, { defaultValue: s })}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.title')}</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('users.titlePlaceholder')} />
          </div>
          {editing && canSeeSalary && (
            <div className="space-y-1.5">
              <Label>{t('common.annualSalary')} (USD)</Label>
              <Input
                type="number"
                min={0}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                disabled={!canEditSalary}
                placeholder={canEditSalary ? '0' : '—'}
              />
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.create')}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
