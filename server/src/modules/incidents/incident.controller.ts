import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { incidentService } from './incident.service.js';
import type { CreateIncidentDto, PostmortemDto, TimelineEntryDto, UpdateIncidentDto } from './incident.dto.js';

export const incidentController = {
  list: asyncHandler(async (req, res: Response) => paginated(res, await incidentService.list(validatedQuery(req)))),
  getById: asyncHandler(async (req: Request, res: Response) => ok(res, await incidentService.getById(req.params.id))),
  create: asyncHandler(async (req: Request, res: Response) =>
    created(res, await incidentService.create(req.body as CreateIncidentDto, req.user?.id)),
  ),
  update: asyncHandler(async (req: Request, res: Response) => ok(res, await incidentService.update(req.params.id, req.body as UpdateIncidentDto))),
  addTimeline: asyncHandler(async (req: Request, res: Response) =>
    created(res, await incidentService.addTimelineEntry(req.params.id, req.body as TimelineEntryDto, req.user?.id)),
  ),
  postmortem: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await incidentService.upsertPostmortem(req.params.id, req.body as PostmortemDto)),
  ),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await incidentService.remove(req.params.id);
    return noContent(res);
  }),
};
