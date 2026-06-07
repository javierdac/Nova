import { z } from 'zod';
import { ROLES } from '../../shared/types/index.js';

const seniority = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal'] as const;

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(ROLES as [string, ...string[]]).default('engineer'),
  title: z.string().max(120).optional(),
  team: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  seniority: z.enum(seniority).optional(),
  timezone: z.string().optional(),
  weeklyCapacityHours: z.number().min(0).max(80).optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// Compensation is intentionally NOT part of updateUserSchema: it carries
// stricter RBAC (head_of_engineering+ to write) and its own dedicated endpoint.
export const setCompensationSchema = z.object({
  annualSalary: z.number().min(0).max(100_000_000),
  currency: z.string().length(3).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  team: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const idParamSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type SetCompensationDto = z.infer<typeof setCompensationSchema>;
