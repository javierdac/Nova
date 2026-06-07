import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { IncidentModel, type IncidentDoc } from './incident.model.js';
import type { CreateIncidentDto, PostmortemDto, TimelineEntryDto, UpdateIncidentDto } from './incident.dto.js';

class IncidentRepository extends BaseRepository<IncidentDoc> {
  protected readonly searchableFields = ['title', 'description'];
}
export const incidentRepository = new IncidentRepository(IncidentModel);

class IncidentService {
  list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: '-detectedAt',
      allowedFilters: ['severity', 'status', 'team', 'service', 'project'],
    });
    return incidentRepository.paginate(query);
  }

  async getById(id: string) {
    const i = await IncidentModel.findById(id)
      .populate('commander', 'name email')
      .populate('team', 'name')
      .lean();
    if (!i) throw new NotFoundError('Incident');
    return i;
  }

  async create(dto: CreateIncidentDto, authorId?: string) {
    return incidentRepository.create({
      ...dto,
      timeline: [{ type: 'detected', message: 'Incident opened', at: dto.detectedAt ?? new Date(), author: authorId }],
    } as Partial<IncidentDoc>);
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const patch: Record<string, unknown> = { ...dto };
    // When transitioning to resolved, stamp resolvedAt + compute MTTR.
    if (dto.status === 'resolved') {
      const current = await incidentRepository.findById(id);
      if (!current) throw new NotFoundError('Incident');
      const resolvedAt = new Date();
      patch.resolvedAt = resolvedAt;
      patch.mttrMinutes = Math.round((resolvedAt.getTime() - new Date(current.detectedAt).getTime()) / 60000);
    }
    const updated = await incidentRepository.updateById(id, patch);
    if (!updated) throw new NotFoundError('Incident');
    return updated;
  }

  async addTimelineEntry(id: string, dto: TimelineEntryDto, authorId?: string) {
    const updated = await incidentRepository.updateById(id, {
      $push: { timeline: { ...dto, at: dto.at ?? new Date(), author: authorId } },
    });
    if (!updated) throw new NotFoundError('Incident');
    return updated;
  }

  async upsertPostmortem(id: string, dto: PostmortemDto) {
    const { publish, ...fields } = dto;
    const updated = await incidentRepository.updateById(id, {
      postmortem: { ...fields, ...(publish ? { publishedAt: new Date() } : {}) },
    });
    if (!updated) throw new NotFoundError('Incident');
    return updated;
  }

  async remove(id: string) {
    if (!(await incidentRepository.deleteById(id))) throw new NotFoundError('Incident');
  }
}

export const incidentService = new IncidentService();
