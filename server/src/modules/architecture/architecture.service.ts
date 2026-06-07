import type { FilterQuery } from 'mongoose';
import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { buildPaginationMeta, escapeRegex, parseListQuery } from '../../shared/utils/query.js';
import { ArchitectureModel, type ArchitectureDoc } from './architecture.model.js';
import type { CreateComponentDto, UpdateComponentDto } from './architecture.dto.js';

class ArchitectureRepository extends BaseRepository<ArchitectureDoc> {
  protected readonly searchableFields = ['name', 'description'];
}
export const architectureRepository = new ArchitectureRepository(ArchitectureModel);

class ArchitectureService {
  /** Paginated list with ownerTeam and dependencies populated for display. */
  async list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: 'name',
      allowedFilters: ['type', 'lifecycle', 'tier', 'ownerTeam'],
    });
    const filter: FilterQuery<ArchitectureDoc> = { ...query.filters } as FilterQuery<ArchitectureDoc>;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      (filter as Record<string, unknown>).$or = [{ name: rx }, { description: rx }];
    }
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      ArchitectureModel.find(filter)
        .sort(query.sort)
        .skip(skip)
        .limit(query.limit)
        .populate('ownerTeam', 'name')
        .populate('dependencies', 'name type')
        .lean(),
      ArchitectureModel.countDocuments(filter),
    ]);
    return { data, meta: buildPaginationMeta(total, query.page, query.limit) };
  }

  async getById(id: string) {
    const c = await ArchitectureModel.findById(id)
      .populate('ownerTeam', 'name')
      .populate('ownerUser', 'name email')
      .populate('dependencies', 'name type lifecycle')
      .lean();
    if (!c) throw new NotFoundError('Component');
    return c;
  }

  create(dto: CreateComponentDto) {
    return architectureRepository.create(dto as Partial<ArchitectureDoc>);
  }

  async update(id: string, dto: UpdateComponentDto) {
    const updated = await architectureRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Component');
    return updated;
  }

  async remove(id: string) {
    if (!(await architectureRepository.deleteById(id))) throw new NotFoundError('Component');
  }

  /** Dependency graph (nodes + edges) for visualization. */
  async dependencyGraph() {
    const components = await ArchitectureModel.find()
      .select('name type lifecycle tier dependencies ownerTeam')
      .lean();
    const nodes = components.map((c) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
      lifecycle: c.lifecycle,
      tier: c.tier,
    }));
    const edges = components.flatMap((c) =>
      (c.dependencies ?? []).map((dep) => ({ from: String(c._id), to: String(dep) })),
    );
    return { nodes, edges };
  }
}

export const architectureService = new ArchitectureService();
