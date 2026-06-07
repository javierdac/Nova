import { z } from 'zod';
import { ROLES } from '../../shared/types/index.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(ROLES as [string, ...string[]]).optional(),
  title: z.string().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// Self-service profile fields any authenticated user may edit about themselves.
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  title: z.string().max(120).optional(),
  timezone: z.string().max(64).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
