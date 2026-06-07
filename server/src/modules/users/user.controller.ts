import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { userService } from './user.service.js';
import type { CreateUserDto, SetCompensationDto, UpdateUserDto } from './user.dto.js';

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.list(validatedQuery(req));
    return paginated(res, result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    return ok(res, await userService.getById(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    return created(res, await userService.create(req.body as CreateUserDto));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    return ok(res, await userService.update(req.params.id, req.body as UpdateUserDto));
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    return ok(res, await userService.deactivate(req.params.id));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.remove(req.params.id);
    return noContent(res);
  }),

  getCompensation: asyncHandler(async (req: Request, res: Response) => {
    return ok(res, await userService.getCompensation(req.params.id));
  }),

  setCompensation: asyncHandler(async (req: Request, res: Response) => {
    return ok(res, await userService.setCompensation(req.params.id, req.body as SetCompensationDto));
  }),
};
