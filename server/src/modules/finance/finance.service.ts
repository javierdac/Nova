import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import type { BaseRepository } from '../../shared/repository/BaseRepository.js';
import {
  cloudCostRepository,
  costOfDelayRepository,
  engineeringCostRepository,
  hiringRoiRepository,
  incidentCostRepository,
  productCostRepository,
  teamCostRepository,
  techDebtCostRepository,
  toolCostRepository,
} from './finance.repositories.js';
import { CloudCostModel } from './models/cloudCost.model.js';
import { ToolCostModel } from './models/toolCost.model.js';
import { TeamCostModel } from './models/teamCost.model.js';
import { ProductCostModel } from './models/productCost.model.js';
import { TechDebtCostModel } from './models/techDebtCost.model.js';
import { IncidentCostModel } from './models/incidentCost.model.js';
import { CostOfDelayModel } from './models/costOfDelay.model.js';
import { HiringRoiModel } from './models/hiringRoi.model.js';
import { EngineeringCostModel } from './models/engineeringCost.model.js';
import { UserModel } from '../users/user.model.js';

/** Generic CRUD operations shared by every finance resource. */
function crud<T>(repo: BaseRepository<T>, label: string, opts: { defaultSort?: string; allowedFilters?: string[] } = {}) {
  return {
    list: (rawQuery: Record<string, unknown>) => {
      const query = parseListQuery(rawQuery, {
        defaultSort: opts.defaultSort ?? '-createdAt',
        allowedFilters: opts.allowedFilters ?? [],
      });
      for (const k of ['year', 'month'] as const) {
        if (query.filters[k] !== undefined) query.filters[k] = Number(query.filters[k]);
      }
      return repo.paginate(query);
    },
    getById: async (id: string) => {
      const doc = await repo.findById(id);
      if (!doc) throw new NotFoundError(label);
      return doc;
    },
    create: (dto: Partial<T>) => repo.create(dto),
    update: async (id: string, dto: Partial<T>) => {
      const updated = await repo.updateById(id, dto);
      if (!updated) throw new NotFoundError(label);
      return updated;
    },
    remove: async (id: string) => {
      if (!(await repo.deleteById(id))) throw new NotFoundError(label);
    },
  };
}

export const financeService = {
  cloudCost: crud(cloudCostRepository, 'Cloud cost', { defaultSort: '-year', allowedFilters: ['provider', 'team', 'product', 'year', 'month'] }),
  toolCost: crud(toolCostRepository, 'Tool cost', { defaultSort: '-monthlyCost', allowedFilters: ['category', 'owner'] }),
  teamCost: crud(teamCostRepository, 'Team cost', { defaultSort: '-totalCost', allowedFilters: ['team', 'year', 'month'] }),
  productCost: crud(productCostRepository, 'Product cost', { defaultSort: '-totalCost', allowedFilters: ['product', 'year', 'month'] }),
  techDebtCost: crud(techDebtCostRepository, 'Technical debt cost', { defaultSort: '-estimatedMonthlyCost', allowedFilters: ['team', 'product', 'impactLevel'] }),
  incidentCost: crud(incidentCostRepository, 'Incident cost', { defaultSort: '-estimatedCost', allowedFilters: ['team', 'severity'] }),
  costOfDelay: crud(costOfDelayRepository, 'Cost of delay', { defaultSort: '-estimatedCostOfDelay', allowedFilters: ['status', 'team', 'product'] }),
  hiringRoi: crud(hiringRoiRepository, 'Hiring ROI', { defaultSort: '-estimatedROI', allowedFilters: ['status', 'team', 'seniority'] }),
  engineeringCost: crud(engineeringCostRepository, 'Engineering cost', { defaultSort: '-year', allowedFilters: ['year'] }),

  /* ── Analytics ───────────────────────────────────────── */

  /** Executive cost dashboard: totals, category split, by team, by product, trend. */
  async executiveDashboard() {
    const [latest, trend, byTeam, byProduct, cloudTotal, toolTotal] = await Promise.all([
      EngineeringCostModel.findOne().sort({ year: -1, month: -1 }).lean(),
      EngineeringCostModel.aggregate([
        { $sort: { year: 1, month: 1 } },
        { $limit: 24 },
        {
          $project: {
            _id: 0,
            period: { $concat: [{ $toString: '$year' }, '-', { $toString: '$month' }] },
            payrollCost: 1, infrastructureCost: 1, saasToolsCost: 1, contractorsCost: 1, totalCost: 1,
          },
        },
      ]),
      TeamCostModel.aggregate([
        { $group: { _id: '$team', total: { $sum: '$totalCost' } } },
        { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
        { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, team: '$team.name', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      ProductCostModel.aggregate([
        { $group: { _id: '$product', total: { $sum: '$totalCost' }, revenue: { $sum: '$monthlyRevenue' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, product: '$product.name', total: 1, revenue: 1 } },
        { $sort: { total: -1 } },
      ]),
      CloudCostModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      ToolCostModel.aggregate([{ $group: { _id: null, total: { $sum: '$monthlyCost' } } }]),
    ]);

    const l = latest ?? { payrollCost: 0, infrastructureCost: 0, saasToolsCost: 0, contractorsCost: 0, totalCost: 0 };
    return {
      current: {
        payrollCost: l.payrollCost,
        infrastructureCost: l.infrastructureCost,
        saasToolsCost: l.saasToolsCost,
        contractorsCost: l.contractorsCost,
        totalCost: l.totalCost,
      },
      categoryBreakdown: [
        { category: 'Payroll', amount: l.payrollCost },
        { category: 'Infrastructure', amount: l.infrastructureCost },
        { category: 'SaaS Tools', amount: l.saasToolsCost },
        { category: 'Contractors', amount: l.contractorsCost },
      ],
      monthlyTrend: trend,
      byTeam,
      byProduct,
      annualizedCloud: (cloudTotal[0]?.total ?? 0),
      annualizedTools: (toolTotal[0]?.total ?? 0) * 12,
    };
  },

  /** Cloud cost analytics: by provider, monthly trend, growth alerts. */
  async cloudAnalytics() {
    const [byProvider, trend] = await Promise.all([
      CloudCostModel.aggregate([
        { $group: { _id: '$provider', total: { $sum: '$amount' } } },
        { $project: { _id: 0, provider: '$_id', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      CloudCostModel.aggregate([
        { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: { _id: 0, period: { $concat: [{ $toString: '$_id.year' }, '-', { $toString: '$_id.month' }] }, total: 1 } },
      ]),
    ]);

    // Growth alert: flag >20% MoM increase on the latest two periods.
    const alerts: Array<{ message: string; pct: number }> = [];
    if (trend.length >= 2) {
      const prev = trend[trend.length - 2].total;
      const cur = trend[trend.length - 1].total;
      if (prev > 0) {
        const pct = Number((((cur - prev) / prev) * 100).toFixed(1));
        if (pct > 20) alerts.push({ message: `El gasto de nube creció ${pct}% mes a mes`, pct });
      }
    }
    return { byProvider, trend, alerts };
  },

  /** SaaS tool utilization + underused-license detection. */
  async toolAnalytics() {
    const tools = await ToolCostModel.find().populate('owner', 'name email').sort('-wastedMonthlySpend').lean();
    const totalMonthly = tools.reduce((s, t) => s + (t.monthlyCost ?? 0), 0);
    const totalWasted = tools.reduce((s, t) => s + (t.wastedMonthlySpend ?? 0), 0);
    const underused = tools.filter((t) => (t.utilization ?? 0) < 70 && (t.activeLicenses ?? 0) > 0);
    return {
      tools,
      summary: {
        totalMonthly: Number(totalMonthly.toFixed(2)),
        totalWastedMonthly: Number(totalWasted.toFixed(2)),
        potentialAnnualSavings: Number((totalWasted * 12).toFixed(2)),
        underusedCount: underused.length,
      },
      underused,
    };
  },

  /** Team cost analytics with cost-per-engineer and trend. */
  async teamCostAnalytics() {
    const byTeam = await TeamCostModel.aggregate([
      { $group: { _id: '$team', total: { $sum: '$totalCost' }, avgPerEngineer: { $avg: '$costPerEngineer' }, headcount: { $last: '$headcount' } } },
      { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
      { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, teamId: '$_id', team: '$team.name', total: 1, avgPerEngineer: { $round: ['$avgPerEngineer', 0] }, headcount: 1 } },
      { $sort: { total: -1 } },
    ]);

    // Real payroll derived from each active member's compensation. Aggregation
    // bypasses the `select: false` flag, so the salary fields are readable here.
    const payrollByTeam = await UserModel.aggregate<{ _id: unknown; actualHeadcount: number; actualAnnualPayroll: number }>([
      { $match: { isActive: true, team: { $ne: null }, 'compensation.annualSalary': { $gt: 0 } } },
      { $group: { _id: '$team', actualHeadcount: { $sum: 1 }, actualAnnualPayroll: { $sum: '$compensation.annualSalary' } } },
    ]);
    const payroll = new Map(payrollByTeam.map((p) => [String(p._id), p]));

    // Merge the salary-derived figures onto each team row.
    const byTeamEnriched = byTeam.map((row) => {
      const p = payroll.get(String(row.teamId));
      const actualHeadcount = p?.actualHeadcount ?? 0;
      const actualAnnualPayroll = p?.actualAnnualPayroll ?? 0;
      return {
        ...row,
        actualHeadcount,
        actualAnnualPayroll,
        actualMonthlyPayroll: Math.round(actualAnnualPayroll / 12),
        costPerPerson: actualHeadcount > 0 ? Math.round(actualAnnualPayroll / actualHeadcount) : 0,
      };
    });

    const trend = await TeamCostModel.aggregate([
      { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$totalCost' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, period: { $concat: [{ $toString: '$_id.year' }, '-', { $toString: '$_id.month' }] }, total: 1 } },
    ]);
    return { byTeam: byTeamEnriched, trend };
  },

  /** Product cost allocation + profitability indicators. */
  async productCostAnalytics() {
    const byProduct = await ProductCostModel.aggregate([
      { $group: { _id: '$product', cost: { $sum: '$totalCost' }, revenue: { $sum: '$monthlyRevenue' } } },
      { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0, product: '$product.name', cost: 1, revenue: 1,
          margin: { $subtract: ['$revenue', '$cost'] },
          profitabilityIndex: { $cond: [{ $gt: ['$cost', 0] }, { $round: [{ $divide: ['$revenue', '$cost'] }, 2] }, 0] },
        },
      },
      { $sort: { cost: -1 } },
    ]);
    return { byProduct };
  },

  /** Top-20 most expensive technical debt + by-team rollup. */
  async techDebtCostAnalytics() {
    const [top, byTeam, totalAgg] = await Promise.all([
      TechDebtCostModel.find().sort('-estimatedMonthlyCost').limit(20).populate('technicalDebt', 'title category').populate('team', 'name').lean(),
      TechDebtCostModel.aggregate([
        { $group: { _id: '$team', total: { $sum: '$estimatedMonthlyCost' } } },
        { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
        { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, team: '$team.name', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      TechDebtCostModel.aggregate([{ $group: { _id: null, monthly: { $sum: '$estimatedMonthlyCost' } } }]),
    ]);
    const monthly = totalAgg[0]?.monthly ?? 0;
    return { top, byTeam, totalMonthlyCost: monthly, totalAnnualCost: Number((monthly * 12).toFixed(2)) };
  },

  /** Incident cost trend, by severity and by team. */
  async incidentCostAnalytics() {
    const [bySeverity, byTeam, trend, totalAgg] = await Promise.all([
      IncidentCostModel.aggregate([
        { $group: { _id: '$severity', total: { $sum: '$estimatedCost' }, count: { $sum: 1 } } },
        { $project: { _id: 0, severity: '$_id', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      IncidentCostModel.aggregate([
        { $group: { _id: '$team', total: { $sum: '$estimatedCost' } } },
        { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
        { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, team: '$team.name', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      IncidentCostModel.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$estimatedCost' } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, period: '$_id', total: 1 } },
      ]),
      IncidentCostModel.aggregate([{ $group: { _id: null, total: { $sum: '$estimatedCost' } } }]),
    ]);
    return { bySeverity, byTeam, trend, totalCost: totalAgg[0]?.total ?? 0 };
  },

  /** Top delayed initiatives by revenue impact. */
  async costOfDelayAnalytics() {
    const top = await CostOfDelayModel.find({ status: { $in: ['at_risk', 'delayed'] } })
      .sort('-estimatedCostOfDelay')
      .limit(20)
      .populate('product', 'name')
      .lean();
    const totalAgg = await CostOfDelayModel.aggregate([
      { $match: { status: { $in: ['at_risk', 'delayed'] } } },
      { $group: { _id: null, total: { $sum: '$estimatedCostOfDelay' } } },
    ]);
    return { top, totalRevenueAtRisk: totalAgg[0]?.total ?? 0 };
  },

  /** Hiring ROI comparison: cost of hiring vs not hiring. */
  async hiringRoiAnalytics() {
    const roles = await HiringRoiModel.find().populate('team', 'name').sort('-estimatedROI').lean();
    const comparison = roles.map((r) => ({
      role: r.role,
      annualCost: r.annualCost,
      estimatedRevenueImpact: r.estimatedRevenueImpact,
      estimatedROI: r.estimatedROI,
      costOfNotHiring: Number(((r.estimatedRevenueImpact ?? 0) - (r.annualCost ?? 0)).toFixed(2)),
      status: r.status,
    }));
    return { roles, comparison };
  },
};
