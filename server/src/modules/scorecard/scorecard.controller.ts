import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ok } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { scorecardService } from './scorecard.service.js';

export const scorecardController = {
  compute: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await scorecardService.compute((validatedQuery<{ team?: string }>(req)).team)),
  ),
};
