import type { ListQuery } from '../types/index.js';

/**
 * Parses common list query params (?page, ?limit, ?sort, ?search, ?filter[x])
 * into a normalized ListQuery. `sort` accepts comma-separated fields with an
 * optional `-` prefix for descending order, e.g. `-createdAt,name`.
 */
export function parseListQuery(
  raw: Record<string, unknown>,
  opts: { defaultSort?: string; maxLimit?: number; allowedFilters?: string[] } = {},
): ListQuery {
  const { defaultSort = '-createdAt', maxLimit = 100, allowedFilters = [] } = opts;

  const page = Math.max(1, Number(raw.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(raw.limit) || 20));

  const sortStr = (raw.sort as string) || defaultSort;
  const sort: Record<string, 1 | -1> = {};
  for (const token of sortStr.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (token.startsWith('-')) sort[token.slice(1)] = -1;
    else sort[token] = 1;
  }

  const filters: Record<string, unknown> = {};
  for (const key of allowedFilters) {
    const value = raw[key];
    if (value !== undefined && value !== '') {
      // support comma lists -> $in
      if (typeof value === 'string' && value.includes(',')) {
        filters[key] = { $in: value.split(',').map((v) => v.trim()) };
      } else {
        filters[key] = value;
      }
    }
  }

  return {
    page,
    limit,
    sort,
    search: typeof raw.search === 'string' && raw.search.trim() ? raw.search.trim() : undefined,
    filters,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Escape a user-supplied string for safe use inside a RegExp. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
