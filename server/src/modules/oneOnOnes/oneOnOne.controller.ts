import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { oneOnOneService } from './oneOnOne.service.js';
import type { CreateOneOnOneDto, UpdateOneOnOneDto } from './oneOnOne.dto.js';

export const oneOnOneController = {
  list: asyncHandler(async (req: Request, res: Response) =>
    paginated(res, await oneOnOneService.list(validatedQuery(req), req.user!)),
  ),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await oneOnOneService.getById(req.params.id, req.user!))),
  create: asyncHandler(async (req: Request, res: Response) =>
    created(res, await oneOnOneService.create(req.body as CreateOneOnOneDto, req.user!)),
  ),
  update: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await oneOnOneService.update(req.params.id, req.body as UpdateOneOnOneDto, req.user!)),
  ),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await oneOnOneService.remove(req.params.id, req.user!);
    return noContent(res);
  }),
};
