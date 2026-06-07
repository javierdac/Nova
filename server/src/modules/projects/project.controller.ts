import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { projectService } from './project.service.js';
import type { CreateProjectDto, UpdateProjectDto } from './project.dto.js';

export const projectController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await projectService.list(validatedQuery(req)))),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await projectService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) => created(res, await projectService.create(req.body as CreateProjectDto))),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await projectService.update(req.params.id, req.body as UpdateProjectDto))),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await projectService.remove(req.params.id);
    return noContent(res);
  }),
};
