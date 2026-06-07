import { Types } from 'mongoose';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { teamRepository } from './team.repository.js';
import { UserModel } from '../users/user.model.js';
import type { CreateTeamDto, PtoDto, UpdateTeamDto } from './team.dto.js';

interface Signals {
  morale: number;
  velocityConfidence: number;
  onCallLoad: number;
  attrition: number;
}

class TeamService {
  /**
   * Composite team health score (0-100). Positive signals are weighted up,
   * negative signals (onCallLoad, attrition) reduce the score.
   */
  computeHealthScore(s: Signals): { score: number; band: 'healthy' | 'at_risk' | 'critical' } {
    const positive = s.morale * 0.35 + s.velocityConfidence * 0.3;
    const negative = s.onCallLoad * 0.2 + s.attrition * 0.15;
    const score = Math.round(Math.max(0, Math.min(100, positive + (100 - negative) * 0.35)));
    const band = score >= 75 ? 'healthy' : score >= 50 ? 'at_risk' : 'critical';
    return { score, band };
  }

  /** Effective weekly capacity accounting for active PTO this week. */
  async computeCapacity(teamId: string): Promise<{ totalHours: number; availableHours: number; onPtoCount: number }> {
    const team = await teamRepository.findById(teamId);
    if (!team) throw new NotFoundError('Team');

    const members = await UserModel.find({ _id: { $in: team.members ?? [] }, isActive: true })
      .select('weeklyCapacityHours')
      .lean();
    const totalHours = members.reduce((sum, m) => sum + (m.weeklyCapacityHours ?? 40), 0);

    const now = new Date();
    const onPto = (team.pto ?? []).filter((p) => p.startDate <= now && p.endDate >= now);
    const onPtoIds = new Set(onPto.map((p) => String(p.user)));
    const lostHours = members
      .filter((m) => onPtoIds.has(String(m._id)))
      .reduce((sum, m) => sum + (m.weeklyCapacityHours ?? 40), 0);

    return { totalHours, availableHours: Math.max(0, totalHours - lostHours), onPtoCount: onPto.length };
  }

  private async decorate(team: Record<string, unknown> | null) {
    if (!team) return team;
    const signals = (team.signals as Signals) ?? { morale: 70, velocityConfidence: 70, onCallLoad: 30, attrition: 10 };
    const health = this.computeHealthScore(signals);
    return { ...team, healthScore: health.score, healthBand: health.band };
  }

  async list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, { defaultSort: 'name', allowedFilters: ['isActive', 'lead'] });
    if (query.filters.isActive !== undefined) query.filters.isActive = query.filters.isActive === 'true';
    const result = await teamRepository.paginate(query);
    result.data = (await Promise.all(
      result.data.map((t) => this.decorate(t as Record<string, unknown>)),
    )) as unknown as typeof result.data;
    return result;
  }

  async getById(id: string) {
    const team = await teamRepository.findByIdPopulated(id);
    if (!team) throw new NotFoundError('Team');
    const decorated = await this.decorate(team as Record<string, unknown>);
    const capacity = await this.computeCapacity(id);
    return { ...decorated, capacity };
  }

  async create(dto: CreateTeamDto) {
    return teamRepository.create(dto);
  }

  async update(id: string, dto: UpdateTeamDto) {
    const updated = await teamRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Team');
    return this.decorate(updated as Record<string, unknown>);
  }

  async assignMembers(id: string, members: string[]) {
    const teamId = new Types.ObjectId(id);
    const memberIds = members.map((m) => new Types.ObjectId(m));
    const updated = await teamRepository.updateById(id, { members: memberIds });
    if (!updated) throw new NotFoundError('Team');
    // Clear the back-reference for users removed from this team.
    await UserModel.updateMany({ team: teamId, _id: { $nin: memberIds } }, { $unset: { team: '' } });
    // Set the back-reference on current members.
    await UserModel.updateMany({ _id: { $in: memberIds } }, { team: teamId });
    return updated;
  }

  async addPto(id: string, dto: PtoDto) {
    const updated = await teamRepository.updateById(id, { $push: { pto: dto } });
    if (!updated) throw new NotFoundError('Team');
    return updated;
  }

  async removePto(id: string, ptoId: string) {
    const updated = await teamRepository.updateById(id, { $pull: { pto: { _id: new Types.ObjectId(ptoId) } } });
    if (!updated) throw new NotFoundError('Team');
    return updated;
  }

  async remove(id: string) {
    const deleted = await teamRepository.deleteById(id);
    if (!deleted) throw new NotFoundError('Team');
  }
}

export const teamService = new TeamService();
