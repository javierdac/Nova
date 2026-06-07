export type Role = 'admin' | 'cto' | 'head_of_engineering' | 'engineering_manager' | 'engineer' | 'viewer';

export const ROLES: Role[] = [
  'admin',
  'cto',
  'head_of_engineering',
  'engineering_manager',
  'engineer',
  'viewer',
];

/** Role hierarchy weights — higher number = more privilege. */
export const ROLE_RANK: Record<Role, number> = {
  admin: 100,
  cto: 90,
  head_of_engineering: 80,
  engineering_manager: 60,
  engineer: 30,
  viewer: 10,
};

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListQuery {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  filters: Record<string, unknown>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}
