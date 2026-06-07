import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { architectureService } from './architecture.service.js';
import type { CreateComponentDto, UpdateComponentDto } from './architecture.dto.js';

export const architectureController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await architectureService.list(validatedQuery(req)))),
  graph: asyncHandler(async (_req: Request, res: Response) => ok(res, await architectureService.dependencyGraph())),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await architectureService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) => created(res, await architectureService.create(req.body as CreateComponentDto))),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await architectureService.update(req.params.id, req.body as UpdateComponentDto))),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await architectureService.remove(req.params.id);
    return noContent(res);
  }),
};
