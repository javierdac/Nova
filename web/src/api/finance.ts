import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AIResult, Paginated } from '@/types';

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

/* ── Analytics dashboards ──────────────────────────────── */
export interface ExecutiveCost {
  current: { payrollCost: number; infrastructureCost: number; saasToolsCost: number; contractorsCost: number; totalCost: number };
  categoryBreakdown: { category: string; amount: number }[];
  monthlyTrend: { period: string; payrollCost: number; infrastructureCost: number; saasToolsCost: number; contractorsCost: number; totalCost: number }[];
  byTeam: { team: string; total: number }[];
  byProduct: { product: string; total: number; revenue: number }[];
  annualizedCloud: number;
  annualizedTools: number;
}

export const useExecutiveCost = () => useQuery({ queryKey: ['fin-exec'], queryFn: () => getOne<ExecutiveCost>('/finance/dashboard/executive') });
export const useCloudAnalytics = () => useQuery({ queryKey: ['fin-cloud'], queryFn: () => getOne<CloudAnalytics>('/finance/dashboard/cloud') });
export const useToolAnalytics = () => useQuery({ queryKey: ['fin-tools'], queryFn: () => getOne<ToolAnalytics>('/finance/dashboard/tools') });
export const useTeamCostAnalytics = () => useQuery({ queryKey: ['fin-teams'], queryFn: () => getOne<TeamCostAnalytics>('/finance/dashboard/teams') });
export const useProductCostAnalytics = () => useQuery({ queryKey: ['fin-products'], queryFn: () => getOne<ProductCostAnalytics>('/finance/dashboard/products') });
export const useTechDebtCostAnalytics = () => useQuery({ queryKey: ['fin-techdebt'], queryFn: () => getOne<TechDebtCostAnalytics>('/finance/dashboard/tech-debt') });
export const useIncidentCostAnalytics = () => useQuery({ queryKey: ['fin-incidents'], queryFn: () => getOne<IncidentCostAnalytics>('/finance/dashboard/incidents') });
export const useCostOfDelayAnalytics = () => useQuery({ queryKey: ['fin-cod'], queryFn: () => getOne<CostOfDelayAnalytics>('/finance/dashboard/cost-of-delay') });
export const useHiringRoiAnalytics = () => useQuery({ queryKey: ['fin-hiring'], queryFn: () => getOne<HiringRoiAnalytics>('/finance/dashboard/hiring-roi') });

/* ── AI advisor ────────────────────────────────────────── */
export const useCostAdvice = (enabled = false) =>
  useQuery({ queryKey: ['fin-advice'], queryFn: () => getOne<AIResult>('/finance/advisor/recommendations'), enabled });
export const useWeeklyCostReport = (enabled = false) =>
  useQuery({ queryKey: ['fin-weekly'], queryFn: () => getOne<AIResult>('/finance/advisor/weekly-report'), enabled });

/* ── Generic CRUD list + mutations for ledger resources ── */
export const useFinanceList = <T>(resource: string, params?: Query) =>
  useQuery({ queryKey: [`fin-${resource}`, params], queryFn: () => getList<T>(`/finance/${resource}`, params) });

export const useFinanceMutations = (resource: string) => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [`fin-${resource}`] });
  return {
    create: useMutation({ mutationFn: (body: unknown) => api.post(`/finance/${resource}`, body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch(`/finance/${resource}/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/finance/${resource}/${id}`), onSuccess: invalidate }),
  };
};

/* ── Analytics response types ──────────────────────────── */
export interface CloudAnalytics {
  byProvider: { provider: string; total: number }[];
  trend: { period: string; total: number }[];
  alerts: { message: string; pct: number }[];
}
export interface ToolRow {
  _id: string; toolName: string; category: string; monthlyCost: number;
  activeLicenses: number; usedLicenses: number; utilization: number; wastedMonthlySpend: number;
  renewalDate?: string; owner?: { name: string } | string;
}
export interface ToolAnalytics {
  tools: ToolRow[];
  summary: { totalMonthly: number; totalWastedMonthly: number; potentialAnnualSavings: number; underusedCount: number };
  underused: ToolRow[];
}
export interface TeamCostAnalytics {
  byTeam: {
    teamId: string;
    team: string;
    total: number;
    avgPerEngineer: number;
    headcount: number;
    // Derived from each active member's individual salary.
    actualHeadcount: number;
    actualAnnualPayroll: number;
    actualMonthlyPayroll: number;
    costPerPerson: number;
  }[];
  trend: { period: string; total: number }[];
}
export interface ProductCostAnalytics {
  byProduct: { product: string; cost: number; revenue: number; margin: number; profitabilityIndex: number }[];
}
export interface TechDebtCostAnalytics {
  top: Array<{ _id: string; estimatedMonthlyCost: number; hoursLostPerMonth: number; impactLevel: string; technicalDebt?: { title: string }; team?: { name: string } }>;
  byTeam: { team: string; total: number }[];
  totalMonthlyCost: number;
  totalAnnualCost: number;
}
export interface IncidentCostAnalytics {
  bySeverity: { severity: string; total: number; count: number }[];
  byTeam: { team: string; total: number }[];
  trend: { period: string; total: number }[];
  totalCost: number;
}
export interface CostOfDelayAnalytics {
  top: Array<{ _id: string; featureName: string; expectedMonthlyRevenue: number; delayMonths: number; estimatedCostOfDelay: number; status: string; product?: { name: string } }>;
  totalRevenueAtRisk: number;
}
export interface HiringRoiAnalytics {
  roles: Array<{ _id: string; role: string; annualCost: number; estimatedRevenueImpact: number; estimatedROI: number; status: string }>;
  comparison: Array<{ role: string; annualCost: number; estimatedRevenueImpact: number; estimatedROI: number; costOfNotHiring: number; status: string }>;
}
