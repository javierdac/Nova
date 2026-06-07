import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, ok } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { engagementService } from './engagement.service.js';
import type { CreatePulseDto, SummaryQuery } from './engagement.dto.js';

export const engagementController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const q = validatedQuery<SummaryQuery>(req);
    return ok(res, await engagementService.summary(q.period, q.teamId));
  }),
  create: asyncHandler(async (req: Request, res: Response) =>
    created(res, await engagementService.create(req.body as CreatePulseDto)),
  ),
};
