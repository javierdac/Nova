import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ok } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { investmentService } from './investment.service.js';
import type { AllocationQuery } from './investment.dto.js';

export const investmentController = {
  allocation: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await investmentService.allocation(validatedQuery<AllocationQuery>(req))),
  ),
  trend: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await investmentService.trend(validatedQuery<AllocationQuery>(req))),
  ),
};
