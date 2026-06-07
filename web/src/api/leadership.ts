import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ── Weekly Brief / Action Center ──────────────────────── */
export type Severity = 'high' | 'medium' | 'low';
export type Domain = 'reliability' | 'delivery' | 'people' | 'cost';
export interface Brief {
  summary: { high: number; medium: number; low: number; total: number };
  headline: string;
  items: { domain: Domain; severity: Severity; title: string; detail: string }[];
}

/* ── Health Scorecard ──────────────────────────────────── */
export type Dimension = 'delivery' | 'reliability' | 'quality' | 'people' | 'cost';
export interface Scorecard {
  global: number;
  target: number;
  weakest: Dimension;
  dimensions: { dimension: Dimension; score: number; target: number; weight: number }[];
  trend: { label: string; score: number }[];
}

/* ── Engagement / eNPS ─────────────────────────────────── */
export interface Engagement {
  period: string | null;
  responses: number;
  enps: number;
  breakdown: { promoters: number; passives: number; detractors: number };
  dimensions: { key: string; avg: number }[];
  byTeam: { team: string; responses: number; enps: number; promoters: number; passives: number; detractors: number }[];
  trend: { period: string; enps: number }[];
}

export interface PulseInput {
  team?: string;
  period: string;
  recommendScore: number;
  dimensions?: { workload: number; clarity: number; growth: number; management: number };
  comment?: string;
}

async function getOne<T>(path: string): Promise<T> {
  return (await api.get(path)).data.data;
}

export const useBrief = () => useQuery({ queryKey: ['brief'], queryFn: () => getOne<Brief>('/brief/weekly') });
export const useScorecard = () => useQuery({ queryKey: ['scorecard'], queryFn: () => getOne<Scorecard>('/scorecard') });
export const useEngagement = () => useQuery({ queryKey: ['engagement'], queryFn: () => getOne<Engagement>('/engagement/summary') });

export const useCreatePulse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PulseInput) => api.post('/engagement/responses', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engagement'] }),
  });
};
