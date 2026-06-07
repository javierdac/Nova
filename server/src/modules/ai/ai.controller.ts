import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ok } from '../../shared/http/respond.js';
import { aiService } from './ai.service.js';
import { aiEnabled } from './openai.client.js';

export const aiController = {
  status: asyncHandler(async (_req: Request, res: Response) => ok(res, { enabled: aiEnabled() })),
  weeklySummary: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await aiService.weeklyExecutiveSummary(req.query.team as string | undefined)),
  ),
  teamRisk: asyncHandler(async (req: Request, res: Response) => ok(res, await aiService.teamRiskAnalysis(req.params.teamId))),
  burnout: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await aiService.burnoutDetection(req.query.team as string | undefined)),
  ),
  techDebt: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await aiService.techDebtRecommendations(req.query.team as string | undefined)),
  ),
  roadmapRisk: asyncHandler(async (_req: Request, res: Response) => ok(res, await aiService.roadmapRiskPrediction())),
  healthReport: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await aiService.engineeringHealthReport(req.query.team as string | undefined)),
  ),
};
