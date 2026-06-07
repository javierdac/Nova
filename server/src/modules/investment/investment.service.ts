import { Types } from 'mongoose';
import { ProjectModel } from '../projects/project.model.js';
import { TechDebtModel } from '../techDebt/techDebt.model.js';
import { TeamModel } from '../teams/team.model.js';
import { TeamCostModel } from '../finance/models/teamCost.model.js';
import { IncidentCostModel } from '../finance/models/incidentCost.model.js';

/**
 * Engineering Investment Allocation.
 *
 * The signature Head-of-Engineering question: where does our most expensive
 * resource actually go? We allocate the period's total engineering cost across
 * four buckets, derived from data Nova already holds — no manual entry:
 *
 *   - incidents  → real $ from IncidentCost (engineers × hours × rate)
 *   - tech_debt  → tech-debt items actively in progress, weighted by effortScore
 *   - new_value  → active projects tagged investmentCategory = 'new_value'
 *   - ktlo       → active projects tagged investmentCategory = 'ktlo'
 *
 * Incidents are *measured* in dollars; the remaining (planned) capacity is split
 * among the other three buckets by effort points. This keeps the one real signal
 * honest and treats the rest as a transparent, documented allocation.
 */

export type Category = 'new_value' | 'ktlo' | 'tech_debt' | 'incidents';
export const CATEGORIES: Category[] = ['new_value', 'ktlo', 'tech_debt', 'incidents'];

/**
 * Effort model (tunable). The buckets must be comparable in "engineer-effort"
 * terms, so we can't sum a tech-debt ticket's 1–10 score directly against a
 * project's priority. A project is a *sustained* effort; a single tech-debt
 * ticket or incident is a fraction of one.
 *
 *   project points = PROJECT_BASE_EFFORT × priority multiplier × status multiplier
 *   tech-debt points = the item's effortScore (1–10)
 *
 * Defaults: one critical project (10×2=20) ≈ two max-effort tech-debt tickets;
 * a medium project (10) ≈ 2–3 typical tickets. Adjust the constants to retune.
 */
const PROJECT_BASE_EFFORT = 10;
const PRIORITY_MULTIPLIER: Record<string, number> = { critical: 2, high: 1.5, medium: 1, low: 0.5 };
// Planned work is ramping up, not consuming full capacity yet.
const STATUS_MULTIPLIER: Record<string, number> = { active: 1, planned: 0.4 };
const ACTIVE_PROJECT = ['active', 'planned'];

/** Effort points for one active project (priority × status weighted). Pure. */
export function projectEffortPoints(priority?: string, status?: string): number {
  return PROJECT_BASE_EFFORT * (PRIORITY_MULTIPLIER[priority ?? 'medium'] ?? 1) * (STATUS_MULTIPLIER[status ?? 'active'] ?? 1);
}

/** Allocate a slice of `remaining` cost proportional to `points` / `totalPoints`. Pure. */
export function splitRemaining(remaining: number, points: number, totalPoints: number): number {
  return totalPoints > 0 ? Math.round((remaining * points) / totalPoints) : 0;
}

interface AllocationOpts {
  year?: number;
  quarter?: number; // 1..4
  teamId?: string;
}

interface Bucket {
  new_value: number;
  ktlo: number;
  tech_debt: number;
  incidents: number;
}

function quarterMonths(q: number): number[] {
  const start = (q - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

function emptyBucket(): Bucket {
  return { new_value: 0, ktlo: 0, tech_debt: 0, incidents: 0 };
}

class InvestmentService {
  /** Allocation for one period (defaults to the current quarter). */
  async allocation(opts: AllocationOpts = {}) {
    const now = new Date();
    const year = opts.year ?? now.getFullYear();
    const quarter = opts.quarter ?? Math.floor(now.getMonth() / 3) + 1;
    const months = quarterMonths(quarter);
    const from = new Date(year, months[0] - 1, 1);
    const to = new Date(year, months[2], 0, 23, 59, 59, 999);
    const teamId = opts.teamId ? new Types.ObjectId(opts.teamId) : undefined;
    const teamMatch = teamId ? { team: teamId } : {};

    const teams = await TeamModel.find(teamId ? { _id: teamId } : {}).select('name').lean();
    const teamName = new Map(teams.map((t) => [String(t._id), t.name]));

    // 1) Total engineering cost for the period (denominator), per team.
    const teamCostRows = await TeamCostModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { year, month: { $in: months }, ...teamMatch } },
      { $group: { _id: '$team', total: { $sum: '$totalCost' } } },
    ]);
    const costByTeam = new Map(teamCostRows.map((r) => [String(r._id), r.total]));
    const totalEngCost = teamCostRows.reduce((s, r) => s + r.total, 0);

    // 2) Incidents — real $ from IncidentCost joined to incidents detected in period.
    const incidentRows = await IncidentCostModel.aggregate<{ _id: Types.ObjectId | null; cost: number }>([
      { $match: { ...teamMatch } },
      { $lookup: { from: 'incidents', localField: 'incident', foreignField: '_id', as: 'inc' } },
      { $unwind: '$inc' },
      { $match: { 'inc.detectedAt': { $gte: from, $lte: to } } },
      { $group: { _id: '$team', cost: { $sum: '$estimatedCost' } } },
    ]);
    const incidentCostByTeam = new Map(incidentRows.map((r) => [String(r._id), r.cost]));

    // 3) Tech-debt effort points (actively in progress), per team.
    const debtRows = await TechDebtModel.aggregate<{ _id: Types.ObjectId | null; points: number }>([
      { $match: { status: 'in_progress', ...teamMatch } },
      { $group: { _id: '$team', points: { $sum: '$effortScore' } } },
    ]);
    const debtPointsByTeam = new Map(debtRows.map((r) => [String(r._id), r.points]));

    // 4) Project effort points (priority-weighted), per team and category.
    const projects = await ProjectModel.find({ status: { $in: ACTIVE_PROJECT }, ...teamMatch })
      .select('priority status investmentCategory team')
      .lean();
    const newValueByTeam = new Map<string, number>();
    const ktloByTeam = new Map<string, number>();
    for (const p of projects) {
      const tid = String(p.team);
      const pts = projectEffortPoints(p.priority, p.status);
      const target = p.investmentCategory === 'ktlo' ? ktloByTeam : newValueByTeam;
      target.set(tid, (target.get(tid) ?? 0) + pts);
    }

    // Compose per-team allocation: incidents are measured $, the rest splits the
    // remaining capacity by effort points.
    const teamIds = new Set<string>([
      ...costByTeam.keys(),
      ...incidentCostByTeam.keys(),
      ...debtPointsByTeam.keys(),
      ...newValueByTeam.keys(),
      ...ktloByTeam.keys(),
    ]);

    const byTeam: Array<{ team: string; teamId: string } & Bucket & { total: number }> = [];
    const totals = emptyBucket();

    for (const tid of teamIds) {
      const engCost = costByTeam.get(tid) ?? 0;
      const incidents = Math.min(incidentCostByTeam.get(tid) ?? 0, engCost);
      const remaining = Math.max(engCost - incidents, 0);

      const nv = newValueByTeam.get(tid) ?? 0;
      const kt = ktloByTeam.get(tid) ?? 0;
      const td = debtPointsByTeam.get(tid) ?? 0;
      const plannedPoints = nv + kt + td;

      const bucket: Bucket = {
        new_value: splitRemaining(remaining, nv, plannedPoints),
        ktlo: splitRemaining(remaining, kt, plannedPoints),
        tech_debt: splitRemaining(remaining, td, plannedPoints),
        incidents: Math.round(incidents),
      };
      const total = bucket.new_value + bucket.ktlo + bucket.tech_debt + bucket.incidents;

      totals.new_value += bucket.new_value;
      totals.ktlo += bucket.ktlo;
      totals.tech_debt += bucket.tech_debt;
      totals.incidents += bucket.incidents;

      byTeam.push({ teamId: tid, team: teamName.get(tid) ?? 'Sin equipo', ...bucket, total });
    }

    byTeam.sort((a, b) => b.total - a.total);

    const grandTotal = totals.new_value + totals.ktlo + totals.tech_debt + totals.incidents;
    const pct = (n: number) => (grandTotal > 0 ? Math.round((n / grandTotal) * 1000) / 10 : 0);
    const categories = CATEGORIES.map((category) => ({
      category,
      cost: totals[category],
      pct: pct(totals[category]),
    }));

    return {
      period: { year, quarter, label: `Q${quarter} ${year}`, months },
      totalEngineeringCost: grandTotal || totalEngCost,
      categories,
      byTeam,
      insights: this.insights(categories),
    };
  }

  /** Quarter-over-quarter trend for the current and previous quarters. */
  async trend(opts: AllocationOpts = {}) {
    const now = new Date();
    const year = opts.year ?? now.getFullYear();
    const quarter = opts.quarter ?? Math.floor(now.getMonth() / 3) + 1;

    const points: Array<{ label: string } & Bucket> = [];
    for (let i = 3; i >= 0; i--) {
      let q = quarter - i;
      let y = year;
      while (q <= 0) {
        q += 4;
        y -= 1;
      }
      const a = await this.allocation({ year: y, quarter: q, teamId: opts.teamId });
      const b = emptyBucket();
      for (const c of a.categories) b[c.category] = c.cost;
      points.push({ label: a.period.label, ...b });
    }
    return points;
  }

  /** Plain-language flags a Head would want surfaced. */
  private insights(categories: { category: Category; pct: number }[]): string[] {
    const by = Object.fromEntries(categories.map((c) => [c.category, c.pct])) as Record<Category, number>;
    const out: string[] = [];
    const unplanned = (by.ktlo ?? 0) + (by.tech_debt ?? 0) + (by.incidents ?? 0);
    if ((by.new_value ?? 0) < 50) out.push(`Solo ${by.new_value ?? 0}% del esfuerzo va a valor nuevo; el ${unplanned}% es mantenimiento y no planificado.`);
    if ((by.incidents ?? 0) >= 15) out.push(`Los incidentes consumen ${by.incidents}% de la capacidad — revisar fiabilidad.`);
    if ((by.tech_debt ?? 0) < 10) out.push(`La inversión en deuda técnica es baja (${by.tech_debt ?? 0}%); puede acumularse riesgo a futuro.`);
    if (out.length === 0) out.push('Asignación saludable: la mayor parte del esfuerzo va a valor nuevo.');
    return out;
  }
}

export const investmentService = new InvestmentService();
