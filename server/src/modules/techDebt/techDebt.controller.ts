import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { techDebtService } from './techDebt.service.js';
import type { CreateTechDebtDto, UpdateTechDebtDto } from './techDebt.dto.js';

export const techDebtController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await techDebtService.list(validatedQuery(req)))),
  matrix: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await techDebtService.prioritizationMatrix(req.query.team as string | undefined)),
  ),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await techDebtService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) => created(res, await techDebtService.create(req.body as CreateTechDebtDto))),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await techDebtService.update(req.params.id, req.body as UpdateTechDebtDto))),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await techDebtService.remove(req.params.id);
    return noContent(res);
  }),
};
