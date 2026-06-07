import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { ProjectModel, type ProjectDoc } from './project.model.js';
import type { CreateProjectDto, UpdateProjectDto } from './project.dto.js';

class ProjectRepository extends BaseRepository<ProjectDoc> {
  protected readonly searchableFields = ['name', 'description', 'key'];
}
export const projectRepository = new ProjectRepository(ProjectModel);

class ProjectService {
  list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: '-createdAt',
      allowedFilters: ['status', 'priority', 'team', 'owner', 'roadmapHealth'],
    });
    return projectRepository.paginate(query);
  }

  async getById(id: string) {
    const p = await ProjectModel.findById(id).populate('team', 'name').populate('owner', 'name email').lean();
    if (!p) throw new NotFoundError('Project');
    return p;
  }

  create(dto: CreateProjectDto) {
    return projectRepository.create(dto as Partial<ProjectDoc>);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const updated = await projectRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Project');
    return updated;
  }

  async remove(id: string) {
    if (!(await projectRepository.deleteById(id))) throw new NotFoundError('Project');
  }

  /** Roadmap health rollup used by the dashboard. */
  async roadmapSummary(): Promise<{
    on_track: number;
    at_risk: number;
    off_track: number;
    total: number;
    healthPct: number;
  }> {
    const rows = await projectRepository.aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ['planned', 'active', 'on_hold'] } } },
      { $group: { _id: '$roadmapHealth', count: { $sum: 1 } } },
    ]);
    const base = { on_track: 0, at_risk: 0, off_track: 0 } as Record<string, number>;
    for (const r of rows) base[r._id] = r.count;
    const total = base.on_track + base.at_risk + base.off_track || 1;
    return {
      on_track: base.on_track,
      at_risk: base.at_risk,
      off_track: base.off_track,
      total,
      healthPct: Math.round((base.on_track / total) * 100),
    };
  }
}

export const projectService = new ProjectService();
