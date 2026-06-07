import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ok } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { briefService } from './brief.service.js';

export const briefController = {
  weekly: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await briefService.weekly((validatedQuery<{ team?: string }>(req)).team)),
  ),
};
