import type { Request, Response } from 'express';
import { asyncHandler } from '../shared/utils/asyncHandler.js';
import { ok } from '../shared/http/respond.js';
import { integrationService } from './integration.service.js';
import type { Provider } from './integration.model.js';

export const integrationController = {
  list: asyncHandler(async (_req: Request, res: Response) => ok(res, await integrationService.list())),

  configure: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await integrationService.configure(req.params.provider as Provider, req.body)),
  ),

  sync: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await integrationService.sync(req.params.provider as Provider)),
  ),

  runs: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await integrationService.runs(req.params.provider as Provider)),
  ),
};
