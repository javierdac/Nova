import { Types } from 'mongoose';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { ObjectiveModel } from './objective.model.js';
import { objectiveRepository } from './objective.repository.js';
import type { CreateObjectiveDto, KeyResultDto, UpdateObjectiveDto } from './okr.dto.js';

export interface KeyResultLike {
  metricType?: string;
  startValue?: number;
  targetValue: number;
  currentValue?: number;
  confidence?: number;
}

type ObjectiveStatus = 'on_track' | 'at_risk' | 'off_track' | 'achieved';

/** Progress of a single key result as a 0-100 percentage. Pure. */
export function computeKeyResultProgress(kr: KeyResultLike): number {
  const start = kr.startValue ?? 0;
  const current = kr.currentValue ?? 0;
  if (kr.metricType === 'boolean') return current >= kr.targetValue ? 100 : 0;
  const span = kr.targetValue - start;
  if (span === 0) return current >= kr.targetValue ? 100 : 0;
  const pct = ((current - start) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Roll the key results up into an objective-level progress %, average
 * confidence and derived status. Status is driven by confidence (the team's
 * own forecast) with progress only used to mark completion. Pure.
 */
export function rollupObjective(keyResults: KeyResultLike[]): {
  progress: number;
  confidence: number;
  status: ObjectiveStatus;
} {
  if (!keyResults.length) return { progress: 0, confidence: 0, status: 'off_track' };
  const progresses = keyResults.map(computeKeyResultProgress);
  const progress = Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  const confidence = Math.round(
    keyResults.reduce((a, k) => a + (k.confidence ?? 70), 0) / keyResults.length,
  );
  let status: ObjectiveStatus;
  if (progress >= 100) status = 'achieved';
  else if (confidence < 45) status = 'off_track';
  else if (confidence < 70) status = 'at_risk';
  else status = 'on_track';
  return { progress, confidence, status };
}

function decorate(objective: Record<string, unknown> | null) {
  if (!objective) return objective;
  const krs = (objective.keyResults as KeyResultLike[]) ?? [];
  const roll = rollupObjective(krs);
  const keyResults = krs.map((kr) => ({ ...kr, progress: computeKeyResultProgress(kr) }));
  return { ...objective, keyResults, ...roll };
}

class OkrService {
  async list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: '-createdAt',
      allowedFilters: ['team', 'quarter', 'level', 'status', 'owner'],
    });
    const result = await objectiveRepository.paginate(query);
    result.data = result.data.map((o) => decorate(o as Record<string, unknown>)) as unknown as typeof result.data;
    return result;
  }

  async getById(id: string) {
    const obj = await ObjectiveModel.findById(id)
      .populate('owner', 'name email')
      .populate('team', 'name')
      .populate('linkedProjects', 'name key progress roadmapHealth')
      .lean();
    if (!obj) throw new NotFoundError('Objective');
    return decorate(obj as Record<string, unknown>);
  }

  async create(dto: CreateObjectiveDto) {
    const doc = await ObjectiveModel.create(dto);
    return decorate(doc.toObject());
  }

  async update(id: string, dto: UpdateObjectiveDto) {
    const updated = await objectiveRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Objective');
    return decorate(updated as Record<string, unknown>);
  }

  async remove(id: string) {
    if (!(await objectiveRepository.deleteById(id))) throw new NotFoundError('Objective');
  }

  async addKeyResult(id: string, dto: KeyResultDto) {
    const updated = await objectiveRepository.updateById(id, { $push: { keyResults: dto } });
    if (!updated) throw new NotFoundError('Objective');
    return decorate(updated as Record<string, unknown>);
  }

  async updateKeyResult(id: string, krId: string, dto: Partial<KeyResultDto>) {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) set[`keyResults.$.${k}`] = v;
    const updated = await ObjectiveModel.findOneAndUpdate(
      { _id: id, 'keyResults._id': new Types.ObjectId(krId) },
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    if (!updated) throw new NotFoundError('Objective or key result');
    return decorate(updated as Record<string, unknown>);
  }

  /** Company/team rollup: average progress and status counts per group. */
  async rollup(quarter?: string) {
    const match = quarter ? { quarter } : {};
    const objectives = await ObjectiveModel.find(match).populate('team', 'name').lean();
    const decorated = objectives.map((o) => decorate(o as Record<string, unknown>) as unknown as {
      level: string;
      status: ObjectiveStatus;
      progress: number;
      team?: { name?: string };
    });

    const summarize = (items: typeof decorated) => ({
      objectives: items.length,
      avgProgress: items.length ? Math.round(items.reduce((a, o) => a + o.progress, 0) / items.length) : 0,
      onTrack: items.filter((o) => o.status === 'on_track').length,
      atRisk: items.filter((o) => o.status === 'at_risk').length,
      offTrack: items.filter((o) => o.status === 'off_track').length,
      achieved: items.filter((o) => o.status === 'achieved').length,
    });

    const byTeamMap = new Map<string, typeof decorated>();
    for (const o of decorated) {
      const name = o.team?.name ?? 'Company';
      if (!byTeamMap.has(name)) byTeamMap.set(name, []);
      byTeamMap.get(name)!.push(o);
    }

    return {
      overall: summarize(decorated),
      company: summarize(decorated.filter((o) => o.level === 'company')),
      byTeam: [...byTeamMap.entries()].map(([team, items]) => ({ team, ...summarize(items) })),
    };
  }
}

export const okrService = new OkrService();
