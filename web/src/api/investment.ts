import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type InvestmentCategory = 'new_value' | 'ktlo' | 'tech_debt' | 'incidents';

export interface Allocation {
  period: { year: number; quarter: number; label: string; months: number[] };
  totalEngineeringCost: number;
  categories: { category: InvestmentCategory; cost: number; pct: number }[];
  byTeam: Array<{ teamId: string; team: string; new_value: number; ktlo: number; tech_debt: number; incidents: number; total: number }>;
  insights: string[];
}

export type TrendPoint = { label: string; new_value: number; ktlo: number; tech_debt: number; incidents: number };

interface Params {
  year?: number;
  quarter?: number;
  teamId?: string;
}

function qs(p?: Params): string {
  if (!p) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function getOne<T>(path: string): Promise<T> {
  return (await api.get(path)).data.data;
}

export const useInvestmentAllocation = (p?: Params) =>
  useQuery({ queryKey: ['investment-allocation', p], queryFn: () => getOne<Allocation>(`/investment/allocation${qs(p)}`) });

export const useInvestmentTrend = (p?: Params) =>
  useQuery({ queryKey: ['investment-trend', p], queryFn: () => getOne<TrendPoint[]>(`/investment/trend${qs(p)}`) });
