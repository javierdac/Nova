import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { teamService } from './team.service.js';
import type { CreateTeamDto, PtoDto, UpdateTeamDto } from './team.dto.js';

export const teamController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await teamService.list(validatedQuery(req)))),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await teamService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) => created(res, await teamService.create(req.body as CreateTeamDto))),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await teamService.update(req.params.id, req.body as UpdateTeamDto))),
  assignMembers: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await teamService.assignMembers(req.params.id, (req.body as { members: string[] }).members)),
  ),
  capacity: asyncHandler(async (req: Request, res: Response) => ok(res, await teamService.computeCapacity(req.params.id))),
  addPto: asyncHandler(async (req: Request, res: Response) => created(res, await teamService.addPto(req.params.id, req.body as PtoDto))),
  removePto: asyncHandler(async (req: Request, res: Response) => ok(res, await teamService.removePto(req.params.id, req.params.ptoId))),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await teamService.remove(req.params.id);
    return noContent(res);
  }),
};
