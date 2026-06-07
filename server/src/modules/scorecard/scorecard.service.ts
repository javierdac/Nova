import { MetricSnapshotModel } from '../metrics/metric.model.js';
import { IncidentModel } from '../incidents/incident.model.js';
import { dashboardService } from '../dashboard/dashboard.service.js';
import { investmentService } from '../investment/investment.service.js';

/**
 * Engineering Health Scorecard.
 *
 * A single composite score (0–100) over five dimensions, derived from metrics
 * Nova already computes. Meant for board/skip-level reporting — one number with
 * a defensible breakdown, a target line, and a real 6-month trend.
 *
 * All dimension formulas are documented and tunable. Nothing is stored.
 */

export type Dimension = 'delivery' | 'reliability' | 'quality' | 'people' | 'cost';

// Relative weight of each dimension in the global score.
const WEIGHTS: Record<Dimension, number> = {
  delivery: 0.25,
  reliability: 0.25,
  quality: 0.15,
  people: 0.2,
  cost: 0.15,
};
const TARGET = 80;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface ScoreInput {
  roadmapScore: number;
  teamHealth: number;
  newValuePct: number;
  changeFailureRate: number; // percent
  incidents: { sev1: number; open: number; avgMttrMinutes: number };
  techDebt: { highRisk: number; avgRiskScore: number };
}

/** Pure scoring: turns raw signals into the five dimensions + weighted global. */
export function scoreDimensions(i: ScoreInput) {
  // delivery: roadmap health is already a 0–100 percentage.
  const delivery = clamp(i.roadmapScore);
  // reliability: start at 100, penalise unresolved/severe incidents and slow recovery.
  const reliability = clamp(100 - i.incidents.sev1 * 20 - i.incidents.open * 5 - Math.min(20, i.incidents.avgMttrMinutes / 10));
  // quality: penalise high-risk debt and a high average risk score.
  const quality = clamp(100 - i.techDebt.highRisk * 12 - Math.max(0, i.techDebt.avgRiskScore - 5) * 8);
  // people: team health is already a 0–100 score.
  const people = clamp(i.teamHealth);
  // cost: share going to new value, penalised when change failure rate is high.
  const cost = clamp(i.newValuePct - (i.changeFailureRate > 15 ? 10 : 0));

  const scores: Record<Dimension, number> = { delivery, reliability, quality, people, cost };
  const global = clamp(
    (Object.entries(WEIGHTS) as [Dimension, number][]).reduce((sum, [d, w]) => sum + scores[d] * w, 0),
  );
  const dimensions = (Object.keys(WEIGHTS) as Dimension[]).map((d) => ({
    dimension: d,
    score: scores[d],
    target: TARGET,
    weight: WEIGHTS[d],
  }));
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0].dimension;

  return { global, target: TARGET, dimensions, weakest };
}

class ScorecardService {
  async compute(teamId?: string) {
    const [summary, investment] = await Promise.all([
      dashboardService.executiveSummary(teamId),
      investmentService.allocation({ teamId }),
    ]);

    const scored = scoreDimensions({
      roadmapScore: summary.roadmapHealth.score,
      teamHealth: summary.teamHealth.score,
      newValuePct: investment.categories.find((c) => c.category === 'new_value')?.pct ?? 0,
      changeFailureRate: summary.deploymentMetrics.changeFailureRate,
      incidents: summary.incidentMetrics,
      techDebt: { highRisk: summary.technicalRisks.highRisk, avgRiskScore: summary.technicalRisks.avgRiskScore },
    });

    return { ...scored, trend: await this.trend(teamId) };
  }

  /** Real 6-month composite trend from deploy metrics + incidents per month. */
  private async trend(teamId?: string) {
    const teamMatch = teamId ? { team: teamId } : {};
    const now = new Date();
    const points: Array<{ label: string; score: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const [metricAgg, incidentAgg] = await Promise.all([
        MetricSnapshotModel.aggregate<{ cfr: number; lead: number }>([
          { $match: { ...teamMatch, date: { $gte: from, $lte: to } } },
          { $group: { _id: null, cfr: { $avg: '$changeFailureRate' }, lead: { $avg: '$leadTimeHours' } } },
        ]),
        IncidentModel.aggregate<{ sev1: number; total: number }>([
          { $match: { ...teamMatch, detectedAt: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: 1 }, sev1: { $sum: { $cond: [{ $eq: ['$severity', 'SEV1'] }, 1, 0] } } } },
        ]),
      ]);

      const m = metricAgg[0];
      const inc = incidentAgg[0] ?? { sev1: 0, total: 0 };
      // No data for that month → skip the point rather than invent a zero.
      if (!m && !incidentAgg[0]) continue;

      const deliveryScore = m ? clamp(100 - (m.cfr ?? 0) * 100 * 2 - Math.max(0, (m.lead ?? 0) - 24) * 0.5) : 70;
      const reliabilityScore = clamp(100 - inc.sev1 * 20 - Math.max(0, inc.total - inc.sev1) * 5);
      points.push({
        label: from.toLocaleDateString('es-AR', { month: 'short' }),
        score: clamp(deliveryScore * 0.5 + reliabilityScore * 0.5),
      });
    }
    return points;
  }
}

export const scorecardService = new ScorecardService();
