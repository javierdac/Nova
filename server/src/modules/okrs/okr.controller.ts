import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { okrService } from './okr.service.js';
import { forecastService } from './forecast.service.js';
import type { CreateObjectiveDto, KeyResultDto, UpdateObjectiveDto } from './okr.dto.js';

export const okrController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await okrService.list(validatedQuery(req)))),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await okrService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) => created(res, await okrService.create(req.body as CreateObjectiveDto))),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await okrService.update(req.params.id, req.body as UpdateObjectiveDto))),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await okrService.remove(req.params.id);
    return noContent(res);
  }),
  addKeyResult: asyncHandler(async (req: Request, res: Response) => created(res, await okrService.addKeyResult(req.params.id, req.body as KeyResultDto))),
  updateKeyResult: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await okrService.updateKeyResult(req.params.id, req.params.krId, req.body as Partial<KeyResultDto>)),
  ),
  rollup: asyncHandler(async (req: Request, res: Response) => ok(res, await okrService.rollup((validatedQuery<{ quarter?: string }>(req)).quarter))),

  // Delivery predictability
  forecastAll: asyncHandler(async (_req: Request, res: Response) => ok(res, await forecastService.forecastActive())),
  forecastOne: asyncHandler(async (req: Request, res: Response) => ok(res, await forecastService.forecastOne(req.params.projectId))),
};
