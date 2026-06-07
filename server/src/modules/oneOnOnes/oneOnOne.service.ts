import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { ROLE_RANK, type AuthUser } from '../../shared/types/index.js';
import { OneOnOneModel, type OneOnOneDoc } from './oneOnOne.model.js';
import type { CreateOneOnOneDto, UpdateOneOnOneDto } from './oneOnOne.dto.js';

class OneOnOneRepository extends BaseRepository<OneOnOneDoc> {
  protected readonly searchableFields = ['notes'];
}
export const oneOnOneRepository = new OneOnOneRepository(OneOnOneModel);

class OneOnOneService {
  /** Managers see their own 1:1s; leadership (>= head_of_engineering) sees all. */
  private scopeFor(user: AuthUser) {
    if (ROLE_RANK[user.role] >= ROLE_RANK.head_of_engineering) return {};
    return { $or: [{ manager: user.id }, { report: user.id }] };
  }

  list(rawQuery: Record<string, unknown>, user: AuthUser) {
    const query = parseListQuery(rawQuery, { defaultSort: '-date', allowedFilters: ['manager', 'report', 'mood'] });
    return oneOnOneRepository.paginate(query, this.scopeFor(user), [
      { path: 'manager', select: 'name email' },
      { path: 'report', select: 'name email' },
    ]);
  }

  async getById(id: string, user: AuthUser) {
    const isManager = await OneOnOneModel.exists({ _id: id, manager: user.id });
    const canSeePrivate = !!isManager || ROLE_RANK[user.role] >= ROLE_RANK.head_of_engineering;
    const query = OneOnOneModel.findById(id)
      .populate('manager', 'name email')
      .populate('report', 'name email');
    // privateNotes is `select: false`; opt it in only for the owning manager / leadership.
    if (canSeePrivate) query.select('+privateNotes');
    const doc = await query.lean();
    if (!doc) throw new NotFoundError('1:1 note');
    return doc;
  }

  create(dto: CreateOneOnOneDto, user: AuthUser) {
    return oneOnOneRepository.create({ ...dto, manager: dto.manager ?? user.id });
  }

  async update(id: string, dto: UpdateOneOnOneDto, user: AuthUser) {
    const existing = await oneOnOneRepository.findById(id);
    if (!existing) throw new NotFoundError('1:1 note');
    if (String(existing.manager) !== user.id && ROLE_RANK[user.role] < ROLE_RANK.head_of_engineering) {
      throw new ForbiddenError('Only the owning manager can edit this note');
    }
    return oneOnOneRepository.updateById(id, dto);
  }

  async remove(id: string, user: AuthUser) {
    const existing = await oneOnOneRepository.findById(id);
    if (!existing) throw new NotFoundError('1:1 note');
    if (String(existing.manager) !== user.id && ROLE_RANK[user.role] < ROLE_RANK.head_of_engineering) {
      throw new ForbiddenError('Only the owning manager can delete this note');
    }
    await oneOnOneRepository.deleteById(id);
  }
}

export const oneOnOneService = new OneOnOneService();
