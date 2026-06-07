import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Forecast, Objective, OkrRollup, Paginated } from '@/types';

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

export const useObjectives = (params?: Query) => useQuery({ queryKey: ['okrs', params], queryFn: () => getList<Objective>('/okrs', params) });
export const useObjective = (id?: string) =>
  useQuery({ queryKey: ['okr', id], queryFn: () => getOne<Objective>(`/okrs/${id}`), enabled: !!id });
export const useOkrRollup = (quarter?: string) =>
  useQuery({ queryKey: ['okr-rollup', quarter], queryFn: () => getOne<OkrRollup>(`/okrs/rollup${qs({ quarter })}`) });
export const useForecast = () => useQuery({ queryKey: ['okr-forecast'], queryFn: () => getOne<Forecast[]>('/okrs/forecast') });

export const useObjectiveMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['okrs'] });
    qc.invalidateQueries({ queryKey: ['okr-rollup'] });
  };
  return {
    create: useMutation({ mutationFn: (body: unknown) => api.post('/okrs', body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`/okrs/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/okrs/${id}`), onSuccess: invalidate }),
    addKeyResult: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.post(`/okrs/${id}/key-results`, body), onSuccess: invalidate }),
    updateKeyResult: useMutation({ mutationFn: ({ id, krId, body }: { id: string; krId: string; body: unknown }) => api.patch(`/okrs/${id}/key-results/${krId}`, body), onSuccess: invalidate }),
  };
};
