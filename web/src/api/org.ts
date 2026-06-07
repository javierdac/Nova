import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AttritionRisk, Funnel, Headcount, OrgChart, Paginated, Position, Skill, SkillCatalogItem, SkillMatrix } from '@/types';

type Query = Record<string, string | number | boolean | undefined>;

function qs(params?: Query): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
async function getOne<T>(path: string): Promise<T> {
  return (await api.get(path)).data.data;
}
async function getList<T>(path: string, params?: Query): Promise<Paginated<T>> {
  const res = await api.get(`${path}${qs(params)}`);
  return { data: res.data.data, meta: res.data.meta };
}

/* ── Derived views ─────────────────────────────────────── */
export const useHeadcount = () => useQuery({ queryKey: ['org-headcount'], queryFn: () => getOne<Headcount>('/org/headcount') });
export const useFunnel = () => useQuery({ queryKey: ['org-funnel'], queryFn: () => getOne<Funnel>('/org/positions/funnel') });
export const useSkillsMatrix = () => useQuery({ queryKey: ['org-skills-matrix'], queryFn: () => getOne<SkillMatrix>('/org/skills/matrix') });
export const useOrgChart = () => useQuery({ queryKey: ['org-chart'], queryFn: () => getOne<OrgChart>('/org/chart') });
export const useAttritionRisk = () => useQuery({ queryKey: ['org-attrition'], queryFn: () => getOne<AttritionRisk>('/org/attrition-risk') });

/* ── Positions & skills lists ──────────────────────────── */
export const usePositions = (params?: Query) => useQuery({ queryKey: ['org-positions', params], queryFn: () => getList<Position>('/org/positions', params) });
export const useSkills = (params?: Query) => useQuery({ queryKey: ['org-skills', params], queryFn: () => getList<Skill>('/org/skills', params) });
export const useSkillCatalog = (params?: Query) => useQuery({ queryKey: ['org-skill-catalog', params], queryFn: () => getList<SkillCatalogItem>('/org/skill-catalog', params) });

function useResourceMutations(resource: string, invalidateKeys: string[]) {
  const qc = useQueryClient();
  const invalidate = () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  return {
    create: useMutation({ mutationFn: (body: unknown) => api.post(`/org/${resource}`, body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`/org/${resource}/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/org/${resource}/${id}`), onSuccess: invalidate }),
  };
}

export const usePositionMutations = () => useResourceMutations('positions', ['org-positions', 'org-headcount', 'org-funnel']);
export const useSkillMutations = () => useResourceMutations('skills', ['org-skills', 'org-skills-matrix']);
export const useSkillCatalogMutations = () => useResourceMutations('skill-catalog', ['org-skill-catalog']);

/** Add a candidate to a position's hiring pipeline. */
export const useAddCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.post(`/org/positions/${id}/candidates`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-positions'] });
      qc.invalidateQueries({ queryKey: ['org-funnel'] });
    },
  });
};
