import { MetricSnapshotModel } from '../metrics/metric.model.js';
import { IncidentModel } from '../incidents/incident.model.js';
import { TechDebtModel } from '../techDebt/techDebt.model.js';
import { TeamModel } from '../teams/team.model.js';
import { projectService } from '../projects/project.service.js';
import { teamService } from '../teams/team.service.js';

interface Range {
  from: Date;
  to: Date;
}

function defaultRange(days = 90): Range {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

class DashboardService {
  /** Executive summary cards. */
  async executiveSummary(teamId?: string) {
    const teamMatch = teamId ? { team: teamId } : {};
    const range = defaultRange(30);

    const [roadmap, incidentAgg, deployAgg, techDebtAgg, teams] = await Promise.all([
      projectService.roadmapSummary(),
      IncidentModel.aggregate([
        { $match: { ...teamMatch, detectedAt: { $gte: range.from } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 0, 1] } },
            sev1: { $sum: { $cond: [{ $eq: ['$severity', 'SEV1'] }, 1, 0] } },
            avgMttr: { $avg: '$mttrMinutes' },
          },
        },
      ]),
      MetricSnapshotModel.aggregate([
        { $match: { ...teamMatch, date: { $gte: range.from } } },
        {
          $group: {
            _id: null,
            deployments: { $sum: '$deploymentCount' },
            avgLeadTime: { $avg: '$leadTimeHours' },
            avgCfr: { $avg: '$changeFailureRate' },
          },
        },
      ]),
      TechDebtModel.aggregate([
        { $match: { ...teamMatch, status: { $nin: ['resolved', 'wont_fix'] } } },
        { $group: { _id: null, count: { $sum: 1 }, avgRisk: { $avg: '$riskScore' }, highRisk: { $sum: { $cond: [{ $gte: ['$riskScore', 8] }, 1, 0] } } } },
      ]),
      TeamModel.find(teamId ? { _id: teamId } : { isActive: true }).select('signals').lean(),
    ]);

    const inc = incidentAgg[0] ?? { total: 0, open: 0, sev1: 0, avgMttr: 0 };
    const dep = deployAgg[0] ?? { deployments: 0, avgLeadTime: 0, avgCfr: 0 };
    const td = techDebtAgg[0] ?? { count: 0, avgRisk: 0, highRisk: 0 };

    const teamScores = teams.map((t) =>
      teamService.computeHealthScore(
        (t.signals as never) ?? { morale: 70, velocityConfidence: 70, onCallLoad: 30, attrition: 10 },
      ).score,
    );
    const teamHealth = teamScores.length ? Math.round(teamScores.reduce((a, b) => a + b, 0) / teamScores.length) : 0;

    return {
      roadmapHealth: { score: roadmap.healthPct, ...roadmap },
      teamHealth: { score: teamHealth, teams: teamScores.length },
      technicalRisks: { openItems: td.count, highRisk: td.highRisk, avgRiskScore: Number((td.avgRisk ?? 0).toFixed(1)) },
      deploymentMetrics: {
        deployments30d: dep.deployments,
        avgLeadTimeHours: Number((dep.avgLeadTime ?? 0).toFixed(1)),
        changeFailureRate: Number(((dep.avgCfr ?? 0) * 100).toFixed(1)),
      },
      incidentMetrics: {
        total30d: inc.total,
        open: inc.open,
        sev1: inc.sev1,
        avgMttrMinutes: Math.round(inc.avgMttr ?? 0),
      },
    };
  }

  /** Time-bucketed trends for the dashboard charts. */
  async trends(teamId?: string, days = 90) {
    const range = defaultRange(days);
    const teamMatch = teamId ? { team: teamId } : {};

    const daily = await MetricSnapshotModel.aggregate([
      { $match: { ...teamMatch, date: { $gte: range.from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          leadTimeHours: { $avg: '$leadTimeHours' },
          deploymentFrequency: { $sum: '$deploymentCount' },
          availableCapacityHours: { $avg: '$availableCapacityHours' },
          committedCapacityHours: { $avg: '$committedCapacityHours' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const incidents = await IncidentModel.aggregate([
      { $match: { ...teamMatch, detectedAt: { $gte: range.from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } },
          count: { $sum: 1 },
          sev1: { $sum: { $cond: [{ $eq: ['$severity', 'SEV1'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      leadTime: daily.map((d) => ({ date: d._id, value: Number((d.leadTimeHours ?? 0).toFixed(1)) })),
      deploymentFrequency: daily.map((d) => ({ date: d._id, value: d.deploymentFrequency ?? 0 })),
      incidentTrend: incidents.map((d) => ({ date: d._id, count: d.count, sev1: d.sev1 })),
      teamCapacity: daily.map((d) => ({
        date: d._id,
        available: Math.round(d.availableCapacityHours ?? 0),
        committed: Math.round(d.committedCapacityHours ?? 0),
      })),
    };
  }
}

export const dashboardService = new DashboardService();
