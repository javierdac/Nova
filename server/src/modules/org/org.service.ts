import { Types } from 'mongoose';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { UserModel } from '../users/user.model.js';
import { TeamModel } from '../teams/team.model.js';
import { PositionModel } from './position.model.js';
import { SkillModel } from './skill.model.js';
import { positionRepository, skillRepository } from './org.repository.js';
import type {
  CandidateDto,
  CreatePositionDto,
  CreateSkillDto,
  UpdatePositionDto,
  UpdateSkillDto,
} from './org.dto.js';

const OPEN_STATUSES = ['planned', 'open', 'interviewing', 'offer'];

interface AttritionInput {
  tenureMonths: number;
  seniority?: string;
  signals: { attrition?: number; morale?: number; onCallLoad?: number };
  /** Latest team eNPS (−100..100), if a pulse survey exists. Real sentiment input. */
  teamEnps?: number;
}

/**
 * Per-person flight-risk heuristic (0-100). Combines team-level signals
 * (attrition/morale/on-call), real eNPS sentiment, the classic 12-24 month
 * tenure window and seniority (costlier and more marketable to lose).
 * Pure — unit testable.
 */
export function computeAttritionRisk(input: AttritionInput): { score: number; band: 'low' | 'medium' | 'high'; factors: string[] } {
  const { tenureMonths, seniority, signals } = input;
  const factors: string[] = [];
  let score = 0;

  const attrition = signals.attrition ?? 10;
  if (attrition >= 20) {
    score += 35;
    factors.push('highAttrition');
  } else if (attrition >= 12) {
    score += 18;
  }

  const morale = signals.morale ?? 70;
  if (morale < 55) {
    score += 25;
    factors.push('lowMorale');
  } else if (morale < 70) {
    score += 10;
  }

  const onCall = signals.onCallLoad ?? 30;
  if (onCall >= 60) {
    score += 15;
    factors.push('heavyOnCall');
  }

  // Real sentiment from the latest pulse survey, when available.
  if (input.teamEnps !== undefined) {
    if (input.teamEnps < 0) {
      score += 20;
      factors.push('negativeEnps');
    } else if (input.teamEnps < 20) {
      score += 10;
      factors.push('lowEnps');
    } else if (input.teamEnps >= 50) {
      score -= 10; // strong sentiment is protective
    }
  }

  if (tenureMonths >= 12 && tenureMonths <= 24) {
    score += 15;
    factors.push('flightWindow');
  }
  if (tenureMonths > 48) {
    score += 8;
    factors.push('tenurePlateau');
  }

  if (['senior', 'staff', 'principal'].includes(seniority ?? '')) score += 7;

  score = Math.max(0, Math.min(100, score));
  const band = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { score, band, factors };
}

class OrgService {
  /* ── Positions / headcount / hiring ──────────────────── */
  listPositions(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, { defaultSort: '-openedAt', allowedFilters: ['status', 'team', 'seniority'] });
    return positionRepository.paginate(query);
  }

  async createPosition(dto: CreatePositionDto) {
    const doc = await PositionModel.create(dto);
    return doc.toObject();
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    const updated = await positionRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Position');
    return updated;
  }

  async removePosition(id: string) {
    if (!(await positionRepository.deleteById(id))) throw new NotFoundError('Position');
  }

  async addCandidate(id: string, dto: CandidateDto) {
    const updated = await positionRepository.updateById(id, { $push: { pipeline: dto } });
    if (!updated) throw new NotFoundError('Position');
    return updated;
  }

  /** Plan vs. actual headcount and open-req budget by team. */
  async headcount() {
    const teams = await TeamModel.find({ isActive: true }).select('name').lean();
    const [actualByTeam, openByTeam] = await Promise.all([
      UserModel.aggregate<{ _id: Types.ObjectId | null; count: number }>([
        { $match: { isActive: true } },
        { $group: { _id: '$team', count: { $sum: 1 } } },
      ]),
      PositionModel.aggregate<{ _id: Types.ObjectId | null; open: number; budget: number }>([
        { $match: { status: { $in: OPEN_STATUSES } } },
        { $group: { _id: '$team', open: { $sum: 1 }, budget: { $sum: '$budgetedMonthlyCost' } } },
      ]),
    ]);
    const actualMap = new Map(actualByTeam.map((r) => [String(r._id), r.count]));
    const openMap = new Map(openByTeam.map((r) => [String(r._id), r]));

    const byTeam = teams.map((tm) => {
      const actual = actualMap.get(String(tm._id)) ?? 0;
      const open = openMap.get(String(tm._id));
      return {
        teamId: String(tm._id),
        team: tm.name,
        actual,
        open: open?.open ?? 0,
        planned: actual + (open?.open ?? 0),
        openBudgetMonthly: open?.budget ?? 0,
      };
    });
    const totals = byTeam.reduce(
      (a, t) => ({
        actual: a.actual + t.actual,
        open: a.open + t.open,
        openBudgetMonthly: a.openBudgetMonthly + t.openBudgetMonthly,
      }),
      { actual: 0, open: 0, openBudgetMonthly: 0 },
    );
    return { byTeam, totals };
  }

  /** Hiring funnel across all pipelines + average time-to-fill (days). */
  async funnel() {
    const stages = ['applied', 'screen', 'onsite', 'offer', 'hired', 'rejected'];
    const [stageAgg, byStatus, filled, openReqs] = await Promise.all([
      PositionModel.aggregate<{ _id: string; count: number }>([
        { $unwind: '$pipeline' },
        { $group: { _id: '$pipeline.stage', count: { $sum: 1 } } },
      ]),
      PositionModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      PositionModel.find({ status: 'filled', filledAt: { $ne: null } }).select('openedAt filledAt').lean(),
      PositionModel.countDocuments({ status: { $in: OPEN_STATUSES } }),
    ]);
    const stageMap = new Map(stageAgg.map((r) => [r._id, r.count]));
    const byStage = stages.map((s) => ({ stage: s, count: stageMap.get(s) ?? 0 }));

    const avgTimeToFillDays = filled.length
      ? Number(
          (
            filled.reduce(
              (s, p) => s + ((p.filledAt as Date).getTime() - (p.openedAt as Date).getTime()) / 864e5,
              0,
            ) / filled.length
          ).toFixed(1),
        )
      : 0;

    return {
      byStage,
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      avgTimeToFillDays,
      openReqs,
    };
  }

  /* ── Skills matrix ───────────────────────────────────── */
  listSkills(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, { defaultSort: '-level', allowedFilters: ['user', 'category', 'skill'] });
    return skillRepository.paginate(query);
  }

  async createSkill(dto: CreateSkillDto) {
    const doc = await SkillModel.create(dto);
    return doc.toObject();
  }

  async updateSkill(id: string, dto: UpdateSkillDto) {
    const updated = await skillRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Skill');
    return updated;
  }

  async removeSkill(id: string) {
    if (!(await skillRepository.deleteById(id))) throw new NotFoundError('Skill');
  }

  /** Capability heatmap by skill + bus-factor risk (skills with <=1 expert at level >= 4). */
  async skillsMatrix() {
    const rows = await SkillModel.aggregate<{ _id: string; category: string; people: number; avgLevel: number; experts: number }>([
      {
        $group: {
          _id: '$skill',
          category: { $first: '$category' },
          people: { $sum: 1 },
          avgLevel: { $avg: '$level' },
          experts: { $sum: { $cond: [{ $gte: ['$level', 4] }, 1, 0] } },
        },
      },
      { $sort: { people: -1 } },
    ]);
    const skills = rows.map((r) => ({
      skill: r._id,
      category: r.category,
      people: r.people,
      avgLevel: Number(r.avgLevel.toFixed(2)),
      experts: r.experts,
      busFactorRisk: r.experts <= 1,
    }));
    const atRisk = skills.filter((s) => s.busFactorRisk);
    return { skills, busFactor: { atRiskCount: atRisk.length, skills: atRisk } };
  }

  /* ── Org chart ───────────────────────────────────────── */
  async orgChart() {
    const users = await UserModel.find({ isActive: true })
      .select('name title role seniority team manager avatarUrl')
      .lean();
    const reportsCount = new Map<string, number>();
    for (const u of users) {
      if (u.manager) reportsCount.set(String(u.manager), (reportsCount.get(String(u.manager)) ?? 0) + 1);
    }
    const nodes = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      title: u.title ?? '',
      role: u.role,
      seniority: u.seniority,
      team: u.team ? String(u.team) : null,
      managerId: u.manager ? String(u.manager) : null,
      directReports: reportsCount.get(String(u._id)) ?? 0,
    }));
    const maxSpanOfControl = nodes.reduce((m, n) => Math.max(m, n.directReports), 0);
    const managers = nodes.filter((n) => n.directReports > 0).length;
    return { nodes, stats: { people: nodes.length, managers, maxSpanOfControl } };
  }

  /* ── Attrition / retention risk ──────────────────────── */
  async attritionRisk() {
    const { engagementService } = await import('../engagement/engagement.service.js');
    const [users, teams, engagement] = await Promise.all([
      UserModel.find({ isActive: true }).select('name title role seniority team createdAt').lean(),
      TeamModel.find().select('name signals').lean(),
      engagementService.summary(),
    ]);
    const teamMap = new Map(teams.map((t) => [String(t._id), t]));
    const enpsByTeam = new Map(engagement.byTeam.map((b) => [b.teamId, b.enps]));
    const now = Date.now();

    const people = users.map((u) => {
      const tenureMonths = u.createdAt ? (now - new Date(u.createdAt).getTime()) / (30 * 864e5) : 12;
      const team = u.team ? teamMap.get(String(u.team)) : undefined;
      const signals = (team?.signals as AttritionInput['signals']) ?? {};
      const teamEnps = u.team ? enpsByTeam.get(String(u.team)) : undefined;
      const risk = computeAttritionRisk({ tenureMonths, seniority: u.seniority, signals, teamEnps });
      return {
        userId: String(u._id),
        name: u.name,
        title: u.title ?? '',
        team: team?.name ?? null,
        seniority: u.seniority,
        tenureMonths: Number(tenureMonths.toFixed(1)),
        riskScore: risk.score,
        band: risk.band,
        factors: risk.factors,
      };
    });
    people.sort((a, b) => b.riskScore - a.riskScore);
    const summary = {
      high: people.filter((p) => p.band === 'high').length,
      medium: people.filter((p) => p.band === 'medium').length,
      low: people.filter((p) => p.band === 'low').length,
    };
    return { people, summary };
  }
}

export const orgService = new OrgService();
