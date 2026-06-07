import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '@/lib/api';
import type { Paginated } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { Pagination } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

/** A single editable field in the ledger create/edit form. */
export interface LedgerField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  /** Options for `select` fields. A leading blank option is added when the field is optional. */
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  /** Grid span within the 2-column form layout. Defaults to 1. */
  span?: 1 | 2;
}

/** A read-only column in the ledger table. */
export interface LedgerColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface FinanceLedgerProps<T extends { _id: string }> {
  /** REST resource segment under /finance, e.g. 'team-costs'. */
  resource: string;
  /** Section + dialog title. */
  title: string;
  fields: LedgerField[];
  columns: LedgerColumn<T>[];
  /** Default form values for a fresh "create". */
  empty: Record<string, unknown>;
  /** Map an existing row onto form values for "edit". */
  toForm: (row: T) => Record<string, unknown>;
  /** Human label of a row, used in edit title and delete confirmation. */
  rowLabel: (row: T) => string;
  /** Extra react-query keys to invalidate so derived dashboards refetch. */
  invalidateKeys?: string[];
}

/**
 * Editable ledger card for a finance cost resource: paginated table plus a
 * create/edit dialog and row delete. The backend already exposes CRUD for every
 * cost resource; this gives each analytics page a way to actually load the data
 * it visualizes. Mutations invalidate both the ledger and the derived
 * dashboards listed in `invalidateKeys`.
 */
export function FinanceLedger<T extends { _id: string }>({
  resource,
  title,
  fields,
  columns,
  empty,
  toForm,
  rowLabel,
  invalidateKeys = [],
}: FinanceLedgerProps<T>) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, unknown>>(empty);

  const list = useQuery({
    queryKey: [`fin-${resource}`, { page }],
    queryFn: async (): Promise<Paginated<T>> => {
      const res = await api.get(`/finance/${resource}?page=${page}&limit=10`);
      return { data: res.data.data, meta: res.data.meta };
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`fin-${resource}`] });
    invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const create = useMutation({ mutationFn: (body: unknown) => api.post(`/finance/${resource}`, body), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`/finance/${resource}/${id}`, body), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/finance/${resource}/${id}`), onSuccess: invalidate });
  const del = useRowDelete(remove);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setOpen(true); };
  const openEdit = (row: T) => { setEditing(row); setForm(toForm(row)); setError(''); setOpen(true); };

  const buildBody = () => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.name];
      if (f.type === 'number') { out[f.name] = Number(v) || 0; continue; }
      if ((v === '' || v == null) && !f.required) continue; // omit optional empties (e.g. FK selects)
      out[f.name] = v;
    }
    return out;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const body = buildBody();
      if (editing) await update.mutateAsync({ id: editing._id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.add')}</Button>
      </div>

      {list.isLoading ? <LoadingState /> : list.isError ? <ErrorState message={apiError(list.error)} /> : !list.data?.data.length ? (
        <CardContent className="p-0"><EmptyState /></CardContent>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                {columns.map((c) => <TH key={c.header} className={c.className}>{c.header}</TH>)}
                <TH className="text-right">{t('common.edit')}</TH>
              </TR>
            </THead>
            <TBody>
              {list.data.data.map((row) => (
                <TR key={row._id}>
                  {columns.map((c) => <TD key={c.header} className={c.className}>{c.render(row)}</TD>)}
                  <TD><RowActions onEdit={() => openEdit(row)} onDelete={() => del.ask(row._id, rowLabel(row))} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination meta={list.data.meta} onPage={setPage} />
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${rowLabel(editing)}` : title}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name} className={`space-y-1.5 ${f.span === 2 ? 'col-span-2' : ''}`}>
                <Label>{f.label}</Label>
                {f.type === 'select' ? (
                  <Select value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required}>
                    {!f.required && <option value="">—</option>}
                    {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.min}
                    max={f.max}
                    required={f.required}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: f.type === 'number' ? e.target.value : e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </Card>
  );
}
