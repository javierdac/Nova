import { Types } from 'mongoose';
import { TeamModel } from '../teams/team.model.js';
import { PulseResponseModel, PULSE_DIMENSIONS, type PulseResponseDoc } from './pulse.model.js';
import type { CreatePulseDto } from './engagement.dto.js';

/**
 * Team engagement via anonymous pulse surveys.
 *
 * eNPS = %promoters (recommend 9–10) − %detractors (0–6), on a −100..100 scale.
 * Feeds the people picture with real sentiment instead of only-computed risk.
 */

export function enps(responses: Pick<PulseResponseDoc, 'recommendScore'>[]): { enps: number; promoters: number; passives: number; detractors: number } {
  const total = responses.length;
  if (total === 0) return { enps: 0, promoters: 0, passives: 0, detractors: 0 };
  let promoters = 0;
  let detractors = 0;
  for (const r of responses) {
    if (r.recommendScore >= 9) promoters += 1;
    else if (r.recommendScore <= 6) detractors += 1;
  }
  const passives = total - promoters - detractors;
  return { enps: Math.round(((promoters - detractors) / total) * 100), promoters, passives, detractors };
}

class EngagementService {
  async create(dto: CreatePulseDto) {
    return PulseResponseModel.create(dto);
  }

  /** eNPS + dimension averages for a period, broken down by team, plus a trend. */
  async summary(period?: string, teamId?: string) {
    const teamFilter = teamId ? { team: new Types.ObjectId(teamId) } : {};

    // Resolve the period: the requested one, or the latest with data.
    let resolved = period;
    if (!resolved) {
      const latest = await PulseResponseModel.findOne(teamFilter).sort({ period: -1 }).select('period').lean();
      resolved = latest?.period;
    }

    const teams = await TeamModel.find().select('name').lean();
    const teamName = new Map(teams.map((t) => [String(t._id), t.name]));

    const periodResponses = resolved
      ? await PulseResponseModel.find({ period: resolved, ...teamFilter }).lean()
      : [];

    const overall = enps(periodResponses);
    const dimensions = PULSE_DIMENSIONS.map((key) => {
      const vals = periodResponses.map((r) => r.dimensions?.[key]).filter((v): v is number => typeof v === 'number');
      const avg = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
      return { key, avg };
    });

    // By team for the resolved period.
    const byTeamMap = new Map<string, PulseResponseDoc[]>();
    for (const r of periodResponses) {
      const tid = String(r.team);
      if (!byTeamMap.has(tid)) byTeamMap.set(tid, []);
      byTeamMap.get(tid)!.push(r);
    }
    const byTeam = [...byTeamMap.entries()]
      .map(([tid, rs]) => ({ teamId: tid, team: teamName.get(tid) ?? 'Sin equipo', responses: rs.length, ...enps(rs) }))
      .sort((a, b) => b.enps - a.enps);

    // Trend across all periods (optionally team-scoped).
    const periodAgg = await PulseResponseModel.aggregate<{ _id: string; scores: number[] }>([
      { $match: { ...teamFilter } },
      { $group: { _id: '$period', scores: { $push: '$recommendScore' } } },
      { $sort: { _id: 1 } },
    ]);
    const trend = periodAgg.map((p) => ({
      period: p._id,
      enps: enps(p.scores.map((s) => ({ recommendScore: s }))).enps,
    }));

    return {
      period: resolved ?? null,
      responses: periodResponses.length,
      enps: overall.enps,
      breakdown: { promoters: overall.promoters, passives: overall.passives, detractors: overall.detractors },
      dimensions,
      byTeam,
      trend,
    };
  }
}

export const engagementService = new EngagementService();
