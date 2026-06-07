import { useState } from 'react';
import { Plus, Database, Server, Globe, Box, Boxes, GitBranch, BookOpen, LifeBuoy, Users2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArchitecture, useArchitectureGraph, useArchitectureMutations } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/States';
import { SearchBar, FilterSelect } from '@/components/shared/Toolbar';
import { RowActions, ConfirmDelete, useRowDelete } from '@/components/shared/RowActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { apiError } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import type { ArchitectureComponent } from '@/types';

const TYPE_ICON: Record<string, typeof Box> = { database: Database, service: Server, api: Globe };
const TYPES = ['service', 'api', 'database', 'queue', 'cache', 'external', 'frontend', 'job'];
const LIFECYCLES = ['planned', 'active', 'deprecated', 'retired'];
const TIER_TONE = { tier1: 'danger', tier2: 'warning', tier3: 'secondary' } as const;
const EMPTY = { name: '', type: 'service', description: '', tier: 'tier2', language: '', lifecycle: 'active', repoUrl: '', docsUrl: '', dependencies: [] as string[] };

const depId = (d: { _id?: string } | string): string => (typeof d === 'object' && d ? d._id ?? '' : (d ?? ''));

const ownerName = (o?: { name: string } | string) => (typeof o === 'object' && o ? o.name : undefined);
const depName = (d: { name: string } | string) => (typeof d === 'object' ? d.name : d);

/** A compact line describing the protocol / engine of a component. */
function metaLine(c: ArchitectureComponent): string | null {
  if (c.type === 'api' && c.apiSpec?.protocol) return `${c.apiSpec.protocol.toUpperCase()}${c.apiSpec.version ? ` · ${c.apiSpec.version}` : ''}`;
  if (c.type === 'database' && c.dbSpec?.engine) return `${c.dbSpec.engine}${c.dbSpec.version ? ` ${c.dbSpec.version}` : ''}`;
  return null;
}

export default function Architecture() {
  const [tab, setTab] = useState<'cards' | 'graph'>('cards');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ArchitectureComponent | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const { t } = useTranslation();
  const { data, isLoading, isError, error: qErr } = useArchitecture({ limit: 100, search: search || undefined, type: type || undefined });
  const graph = useArchitectureGraph();
  const { create, update, remove } = useArchitectureMutations();
  const del = useRowDelete(remove);
  const canManage = useCan('engineering_manager');
  const canDelete = useCan('head_of_engineering');

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (c: ArchitectureComponent) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, description: c.description ?? '', tier: c.tier, language: c.language ?? '', lifecycle: c.lifecycle ?? 'active', repoUrl: c.repoUrl ?? '', docsUrl: c.docsUrl ?? '', dependencies: (c.dependencies ?? []).map(depId).filter(Boolean) });
    setError('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, repoUrl: form.repoUrl || undefined, docsUrl: form.docsUrl || undefined, language: form.language || undefined };
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
        title={t('pages.architecture.title')}
        subtitle={t('pages.architecture.subtitle')}
        action={
          <div className="flex gap-2">
            <div className="flex rounded-md border p-0.5">
              <button onClick={() => setTab('cards')} className={`rounded px-3 py-1 text-sm ${tab === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('architecture.components')}</button>
              <button onClick={() => setTab('graph')} className={`rounded px-3 py-1 text-sm ${tab === 'graph' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('architecture.dependencies')}</button>
            </div>
            {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('common.add')}</Button>}
          </div>
        }
      />

      {tab === 'cards' && (
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchBar value={search} onChange={setSearch} />
          <FilterSelect value={type} onChange={setType} all={t('common.allTypes')} options={TYPES.map((ty) => ({ value: ty, label: t(`architecture.types.${ty}`) }))} />
        </div>
      )}

      {tab === 'cards' ? (
        isLoading ? <LoadingState /> : isError ? <ErrorState message={apiError(qErr)} /> : !data?.data.length ? <EmptyState /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.data.map((c: ArchitectureComponent) => {
              const Icon = TYPE_ICON[c.type] ?? Box;
              const meta = metaLine(c);
              return (
                <Card key={c._id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{c.name}</span>
                      </CardTitle>
                      <Badge variant={TIER_TONE[c.tier as keyof typeof TIER_TONE] ?? 'secondary'}>{c.tier}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{t(`architecture.types.${c.type}`)}</Badge>
                      <Badge variant={c.lifecycle === 'active' ? 'success' : c.lifecycle === 'deprecated' || c.lifecycle === 'retired' ? 'danger' : 'outline'}>{t(`architecture.lifecycles.${c.lifecycle}`)}</Badge>
                      {c.language && <Badge variant="outline">{c.language}</Badge>}
                      {meta && <Badge variant="outline">{meta}</Badge>}
                    </div>

                    {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users2 className="h-3.5 w-3.5" /> {ownerName(c.ownerTeam) ?? t('common.unassigned')}
                    </p>

                    {!!c.dependencies?.length && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <GitBranch className="h-3.5 w-3.5" />
                        {c.dependencies.map((dep, i) => <Badge key={i} variant="outline" className="font-normal">{depName(dep)}</Badge>)}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between border-t pt-2">
                      <div className="flex gap-2 text-muted-foreground">
                        {c.repoUrl && <a href={c.repoUrl} target="_blank" rel="noreferrer" aria-label="Repository" className="hover:text-foreground"><GitBranch className="h-4 w-4" /></a>}
                        {c.docsUrl && <a href={c.docsUrl} target="_blank" rel="noreferrer" aria-label="Docs" className="hover:text-foreground"><BookOpen className="h-4 w-4" /></a>}
                        {c.runbookUrl && <a href={c.runbookUrl} target="_blank" rel="noreferrer" aria-label="Runbook" className="hover:text-foreground"><LifeBuoy className="h-4 w-4" /></a>}
                      </div>
                      {canManage && <RowActions onEdit={() => openEdit(c)} onDelete={canDelete ? () => del.ask(c._id, c.name) : undefined} />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        graph.isLoading ? <LoadingState /> : graph.isError ? <ErrorState message={apiError(graph.error)} /> : <DependencyMap graph={graph.data!} />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} — ${editing.name}` : t('architecture.register')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t('common.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('common.type')}</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((ty) => <option key={ty} value={ty}>{t(`architecture.types.${ty}`)}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>{t('architecture.tier')}</Label><Select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{['tier1', 'tier2', 'tier3'].map((tr) => <option key={tr}>{tr}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('architecture.language')}</Label><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('architecture.lifecycle')}</Label><Select value={form.lifecycle} onChange={(e) => setForm({ ...form, lifecycle: e.target.value })}>{LIFECYCLES.map((l) => <option key={l} value={l}>{t(`architecture.lifecycles.${l}`)}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t('architecture.repoUrl')}</Label><Input value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label>{t('architecture.docsUrl')}</Label><Input value={form.docsUrl} onChange={(e) => setForm({ ...form, docsUrl: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div className="space-y-1.5"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>{t('architecture.dependencies')}</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {(data?.data as ArchitectureComponent[] | undefined)?.filter((c) => c._id !== editing?._id).length ? (
                (data?.data as ArchitectureComponent[]).filter((c) => c._id !== editing?._id).map((c) => {
                  const checked = form.dependencies.includes(c._id);
                  return (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => setForm({ ...form, dependencies: checked ? form.dependencies.filter((x) => x !== c._id) : [...form.dependencies, c._id] })}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${checked ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                    >
                      <span>{c.name}</span>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-1 py-1 text-xs text-muted-foreground">{t('common.noResults')}</p>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? t('common.save') : t('architecture.register')}</Button></div>
        </form>
      </Dialog>

      <ConfirmDelete {...del.dialogProps} />
    </div>
  );
}

/** Dependency map: each component with what it depends on and what depends on it. */
function DependencyMap({ graph }: { graph: { nodes: Array<{ id: string; name: string; type: string; tier: string }>; edges: Array<{ from: string; to: string }> } }) {
  const { t } = useTranslation();
  if (!graph.nodes.length) return <EmptyState />;

  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]));
  const dependsOn = new Map<string, string[]>();
  const usedBy = new Map<string, string[]>();
  for (const e of graph.edges) {
    dependsOn.set(e.from, [...(dependsOn.get(e.from) ?? []), e.to]);
    usedBy.set(e.to, [...(usedBy.get(e.to) ?? []), e.from]);
  }
  const tierRank: Record<string, number> = { tier1: 0, tier2: 1, tier3: 2 };
  const nodes = [...graph.nodes].sort((a, b) => (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9) || a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {nodes.map((n) => {
        const Icon = TYPE_ICON[n.type] ?? Box;
        const deps = dependsOn.get(n.id) ?? [];
        const dependents = usedBy.get(n.id) ?? [];
        return (
          <Card key={n.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{n.name}</span>
                <Badge variant={TIER_TONE[n.tier as keyof typeof TIER_TONE] ?? 'secondary'} className="ml-auto">{n.tier}</Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" /> {t('architecture.dependsOn')}</span>
                  {deps.length ? deps.map((id) => <Badge key={id} variant="outline" className="font-normal">{nameById.get(id) ?? id}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" /> {t('architecture.usedBy')}</span>
                  {dependents.length ? dependents.map((id) => <Badge key={id} variant="secondary" className="font-normal">{nameById.get(id) ?? id}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <p className="col-span-full flex items-center gap-1 text-xs text-muted-foreground"><Boxes className="h-3.5 w-3.5" /> {t('architecture.graphSummary', { edges: graph.edges.length, nodes: graph.nodes.length })}</p>
    </div>
  );
}
