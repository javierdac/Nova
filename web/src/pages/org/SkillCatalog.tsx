import { useState } from 'react';
import { Plus, Library } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSkillCatalog, useSkillCatalogMutations } from '@/api/org';
import type { SkillCatalogItem } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { apiError } from '@/lib/api';

const CATEGORIES = ['language', 'framework', 'platform', 'domain', 'soft', 'tooling'];
const EMPTY = { name: '', category: 'language', description: '' };

export default function SkillCatalog() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const list = useSkillCatalog({ page, limit: 12, sort: 'name' });
  const { create, update, remove } = useSkillCatalogMutations();
  const del = useRowDelete(remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SkillCatalogItem | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(''); setOpen(true); };
  const openEdit = (s: SkillCatalogItem) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, description: s.description ?? '' });
    setFormError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const body = { name: form.name.trim(), category: form.category, description: form.description.trim() || undefined };
    try {
      if (editing) await update.mutateAsync({ id: editing._id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (err) {
      setFormError(apiError(err));
    }
  };

  if (list.isLoading) return <LoadingState />;
  if (list.isError) return <ErrorState message={apiError(list.error)} />;

  const items = list.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={t('pages.skillCatalog.title')}
        subtitle={t('pages.skillCatalog.subtitle')}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('skillCatalog.add')}</Button>}
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t('skillCatalog.total')} value={list.data?.meta.total ?? 0} icon={Library} />
        <StatCard label={t('skillCatalog.categories')} value={new Set(items.map((s) => s.category)).size} icon={Library} />
      </section>

      <Card>
        {items.length ? (
          <>
            <Table>
              <THead><TR><TH>{t('skillCatalog.name')}</TH><TH>{t('common.category')}</TH><TH>{t('common.description')}</TH><TH className="text-right">{t('common.edit')}</TH></TR></THead>
              <TBody>
                {items.map((s) => (
                  <TR key={s._id}>
                    <TD className="font-medium">{s.name}</TD>
                    <TD><Badge variant="secondary">{t(`skills.categories.${s.category}`, s.category)}</Badge></TD>
                    <TD className="max-w-md truncate text-muted-foreground">{s.description || '—'}</TD>
                    <TD><RowActions onEdit={() => openEdit(s)} onDelete={() => del.ask(s._id, s.name)} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination meta={list.data!.meta} onPage={setPage} />
          </>
        ) : (
          <CardContent className="p-0"><EmptyState /></CardContent>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.name}` : t('skillCatalog.add')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('skillCatalog.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TypeScript" required /></div>
            <div className="space-y-1.5"><Label>{t('common.category')}</Label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(`skills.categories.${c}`, c)}</option>)}</Select></div>
          </div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}
