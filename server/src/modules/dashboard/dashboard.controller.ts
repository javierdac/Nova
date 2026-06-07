import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ok } from '../../shared/http/respond.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await dashboardService.executiveSummary(req.query.team as string | undefined)),
  ),
  trends: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await dashboardService.trends(req.query.team as string | undefined, Number(req.query.days) || 90)),
  ),
};
