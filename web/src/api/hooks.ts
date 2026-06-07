import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AIResult,
  ArchitectureComponent,
  ArchitectureGraph,
  ExecutiveSummary,
  Incident,
  OneOnOne,
  Paginated,
  Project,
  TechDebt,
  Team,
  Trends,
  User,
} from '@/types';

type Query = Record<string, string | number | boolean | undefined>;

function qs(params?: Query): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function getList<T>(path: string, params?: Query): Promise<Paginated<T>> {
  const res = await api.get(`${path}${qs(params)}`);
  return { data: res.data.data, meta: res.data.meta };
}
async function getOne<T>(path: string): Promise<T> {
  return (await api.get(path)).data.data;
}

/** Generic paginated list hook factory. */
function useList<T>(key: string, path: string, params?: Query) {
  return useQuery({ queryKey: [key, params], queryFn: () => getList<T>(path, params) });
}

/** Generic CRUD mutations that invalidate the list cache on success. */
function useCrud(key: string, path: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [key] });
  return {
    create: useMutation({ mutationFn: (body: unknown) => api.post(path, body), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`${path}/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`${path}/${id}`), onSuccess: invalidate }),
  };
}

/* ── Dashboard ─────────────────────────────────────────── */
export const useExecutiveSummary = (team?: string) =>
  useQuery({ queryKey: ['dashboard-summary', team], queryFn: () => getOne<ExecutiveSummary>(`/dashboard/summary${qs({ team })}`) });
export const useTrends = (team?: string, days = 90) =>
  useQuery({ queryKey: ['dashboard-trends', team, days], queryFn: () => getOne<Trends>(`/dashboard/trends${qs({ team, days })}`) });

/* ── Users ─────────────────────────────────────────────── */
export const useUsers = (params?: Query) => useList<User>('users', '/users', params);
export const useUserMutations = () => useCrud('users', '/users');

export interface Compensation {
  userId: string;
  annualSalary: number | null;
  currency: string;
}
/** Reads one person's compensation (finance-read RBAC; enabled only when id set). */
export const useCompensation = (id?: string, enabled = true) =>
  useQuery({
    queryKey: ['compensation', id],
    queryFn: () => getOne<Compensation>(`/users/${id}/compensation`),
    enabled: !!id && enabled,
  });
/** Sets one person's compensation (finance-write RBAC). */
export const useSetCompensation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { annualSalary: number; currency?: string } }) =>
      api.put(`/users/${id}/compensation`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['compensation', v.id] }),
  });
};

/* ── Teams ─────────────────────────────────────────────── */
export const useTeams = (params?: Query) => useList<Team>('teams', '/teams', params);
export const useTeam = (id?: string) =>
  useQuery({ queryKey: ['team', id], queryFn: () => getOne<Team>(`/teams/${id}`), enabled: !!id });
export const useTeamMutations = () => {
  const base = useCrud('teams', '/teams');
  const qc = useQueryClient();
  return {
    ...base,
    assignMembers: useMutation({
      mutationFn: ({ id, members }: { id: string; members: string[] }) =>
        api.put(`/teams/${id}/members`, { members }),
      onSuccess: (_d, v) => {
        qc.invalidateQueries({ queryKey: ['teams'] });
        qc.invalidateQueries({ queryKey: ['team', v.id] });
        qc.invalidateQueries({ queryKey: ['users'] });
      },
    }),
  };
};

/* ── Projects ──────────────────────────────────────────── */
export const useProjects = (params?: Query) => useList<Project>('projects', '/projects', params);
export const useProjectMutations = () => useCrud('projects', '/projects');

/* ── Incidents ─────────────────────────────────────────── */
export const useIncidents = (params?: Query) => useList<Incident>('incidents', '/incidents', params);
export const useIncident = (id?: string) =>
  useQuery({ queryKey: ['incident', id], queryFn: () => getOne<Incident>(`/incidents/${id}`), enabled: !!id });
export const useIncidentMutations = () => {
  const base = useCrud('incidents', '/incidents');
  const qc = useQueryClient();
  return {
    ...base,
    addTimeline: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) => api.post(`/incidents/${id}/timeline`, body),
      onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['incident', v.id] }),
    }),
    savePostmortem: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) => api.put(`/incidents/${id}/postmortem`, body),
      onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['incident', v.id] }),
    }),
  };
};

/* ── Technical debt ────────────────────────────────────── */
export const useTechDebt = (params?: Query) => useList<TechDebt>('tech-debt', '/tech-debt', params);
export const useTechDebtMatrix = (team?: string) =>
  useQuery({
    queryKey: ['tech-debt-matrix', team],
    queryFn: () =>
      getOne<{ quadrants: Record<string, TechDebt[]>; totals: { items: number; avgPriority: number } }>(
        `/tech-debt/matrix${qs({ team })}`,
      ),
  });
export const useTechDebtMutations = () => useCrud('tech-debt', '/tech-debt');

/* ── Architecture ──────────────────────────────────────── */
export const useArchitecture = (params?: Query) => useList<ArchitectureComponent>('architecture', '/architecture', params);
export const useArchitectureGraph = () =>
  useQuery({ queryKey: ['architecture-graph'], queryFn: () => getOne<ArchitectureGraph>('/architecture/graph') });
export const useArchitectureMutations = () => {
  const qc = useQueryClient();
  // Editing a component (esp. its dependencies) changes both the list and the graph.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['architecture'] });
    qc.invalidateQueries({ queryKey: ['architecture-graph'] });
  };
  return {
    create: useMutation({ mutationFn: (body: unknown) => api.post('/architecture', body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`/architecture/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/architecture/${id}`), onSuccess: invalidate }),
  };
};

/* ── One-on-ones ───────────────────────────────────────── */
export const useOneOnOnes = (params?: Query) => useList<OneOnOne>('one-on-ones', '/one-on-ones', params);
export const useOneOnOne = (id?: string) =>
  useQuery({ queryKey: ['one-on-one', id], queryFn: () => getOne<OneOnOne>(`/one-on-ones/${id}`), enabled: !!id });
export const useOneOnOneMutations = () => useCrud('one-on-ones', '/one-on-ones');

/* ── AI ────────────────────────────────────────────────── */
export const useAIStatus = () => useQuery({ queryKey: ['ai-status'], queryFn: () => getOne<{ enabled: boolean }>('/ai/status') });
export const useAIInsight = (kind: string, params?: Query, enabled = false) =>
  useQuery({ queryKey: ['ai', kind, params], queryFn: () => getOne<AIResult>(`/ai/${kind}${qs(params)}`), enabled });
