import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, ok } from '../../shared/http/respond.js';
import { authService } from './auth.service.js';
import { userRepository } from '../users/user.repository.js';
import type { ChangePasswordDto, LoginDto, RefreshDto, RegisterDto, UpdateProfileDto } from './auth.dto.js';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body as RegisterDto);
    return created(res, result);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body as LoginDto);
    return ok(res, result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh((req.body as RefreshDto).refreshToken);
    return ok(res, result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.user!.id);
    return ok(res, { message: 'Logged out' });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    return ok(res, user);
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body as UpdateProfileDto);
    return ok(res, user);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body as ChangePasswordDto);
    return ok(res, { message: 'Password changed; please sign in again.' });
  }),
};
