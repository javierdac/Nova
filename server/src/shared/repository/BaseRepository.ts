import type { FilterQuery, Model, PipelineStage, PopulateOptions, ProjectionType, UpdateQuery } from 'mongoose';
import type { ListQuery, Paginated } from '../types/index.js';
import { buildPaginationMeta, escapeRegex } from '../utils/query.js';

/**
 * Generic repository implementing the Repository Pattern over a Mongoose model.
 * Concrete repositories extend this and declare `searchableFields` to enable
 * `?search=` term matching across text columns.
 */
export abstract class BaseRepository<TDoc> {
  protected abstract readonly searchableFields: string[];

  constructor(protected readonly model: Model<TDoc>) {}

  async create(payload: Record<string, unknown>): Promise<TDoc> {
    // Mongoose performs runtime casting (e.g. string -> ObjectId) for us.
    const doc = await this.model.create(payload as Partial<TDoc>);
    return doc.toObject() as TDoc;
  }

  async findById(id: string, projection?: ProjectionType<TDoc>): Promise<TDoc | null> {
    return this.model.findById(id, projection).lean<TDoc>().exec();
  }

  async findOne(filter: FilterQuery<TDoc>, projection?: ProjectionType<TDoc>): Promise<TDoc | null> {
    return this.model.findOne(filter, projection).lean<TDoc>().exec();
  }

  async exists(filter: FilterQuery<TDoc>): Promise<boolean> {
    return (await this.model.exists(filter)) !== null;
  }

  async updateById(id: string, update: UpdateQuery<TDoc>): Promise<TDoc | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean<TDoc>()
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await this.model.findByIdAndDelete(id).exec();
    return res !== null;
  }

  async count(filter: FilterQuery<TDoc> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Paginated list with search/filter/sort. `baseFilter` lets services scope
   * results (e.g. by organization) on top of request-supplied filters.
   */
  async paginate(
    query: ListQuery,
    baseFilter: FilterQuery<TDoc> = {},
    populate?: PopulateOptions | (PopulateOptions | string)[],
  ): Promise<Paginated<TDoc>> {
    const filter: FilterQuery<TDoc> = { ...baseFilter, ...query.filters } as FilterQuery<TDoc>;

    if (query.search && this.searchableFields.length > 0) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      (filter as Record<string, unknown>).$or = this.searchableFields.map((f) => ({ [f]: rx }));
    }

    const skip = (query.page - 1) * query.limit;
    const listQuery = this.model.find(filter).sort(query.sort).skip(skip).limit(query.limit);
    if (populate) listQuery.populate(populate);
    const [data, total] = await Promise.all([
      listQuery.lean<TDoc[]>().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, meta: buildPaginationMeta(total, query.page, query.limit) };
  }

  async aggregate<R = unknown>(pipeline: PipelineStage[]): Promise<R[]> {
    return this.model.aggregate<R>(pipeline).exec();
  }
}
