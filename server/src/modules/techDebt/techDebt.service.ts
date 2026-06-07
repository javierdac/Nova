import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { TechDebtModel, type TechDebtDoc } from './techDebt.model.js';
import type { CreateTechDebtDto, UpdateTechDebtDto } from './techDebt.dto.js';

class TechDebtRepository extends BaseRepository<TechDebtDoc> {
  protected readonly searchableFields = ['title', 'description'];
}
export const techDebtRepository = new TechDebtRepository(TechDebtModel);

class TechDebtService {
  list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: '-priorityScore',
      allowedFilters: ['category', 'status', 'team', 'owner', 'quadrant'],
    });
    return techDebtRepository.paginate(query);
  }

  async getById(id: string) {
    const d = await TechDebtModel.findById(id).populate('owner', 'name email').populate('team', 'name').lean();
    if (!d) throw new NotFoundError('Technical debt item');
    return d;
  }

  // Use a document instance so the pre-save score derivation runs.
  async create(dto: CreateTechDebtDto) {
    const doc = await TechDebtModel.create(dto);
    return doc.toObject();
  }

  async update(id: string, dto: UpdateTechDebtDto) {
    const updated = await techDebtRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('Technical debt item');
    return updated;
  }

  async remove(id: string) {
    if (!(await techDebtRepository.deleteById(id))) throw new NotFoundError('Technical debt item');
  }

  /** Effort/value prioritization matrix grouped by quadrant. */
  async prioritizationMatrix(teamId?: string) {
    const match = teamId ? { team: teamId } : {};
    const items = await TechDebtModel.find({ ...match, status: { $nin: ['resolved', 'wont_fix'] } })
      .select('title impactScore riskScore effortScore priorityScore quadrant category status')
      .sort('-priorityScore')
      .lean();

    const quadrants: Record<string, typeof items> = { quick_win: [], major_project: [], fill_in: [], thankless: [] };
    for (const item of items) quadrants[item.quadrant ?? 'fill_in']?.push(item);

    return {
      quadrants,
      totals: {
        items: items.length,
        avgPriority: items.length
          ? Number((items.reduce((s, i) => s + (i.priorityScore ?? 0), 0) / items.length).toFixed(2))
          : 0,
      },
    };
  }
}

export const techDebtService = new TechDebtService();
