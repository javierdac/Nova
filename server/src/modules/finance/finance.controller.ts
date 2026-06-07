import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { created, noContent, ok, paginated } from '../../shared/http/respond.js';
import { validatedQuery } from '../../shared/middleware/validate.js';
import { financeService } from './finance.service.js';
import { costAdvisorService } from './costAdvisor.service.js';
import type { Paginated } from '../../shared/types/index.js';

type Resource = keyof Pick<
  typeof financeService,
  'cloudCost' | 'toolCost' | 'teamCost' | 'productCost' | 'techDebtCost' | 'incidentCost' | 'costOfDelay' | 'hiringRoi' | 'engineeringCost'
>;

interface CrudSvc {
  list: (q: Record<string, unknown>) => Promise<Paginated<unknown>>;
  getById: (id: string) => Promise<unknown>;
  create: (body: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, body: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
}

/** Builds a standard CRUD controller bound to a finance resource. */
function crudController(resource: Resource) {
  const svc = financeService[resource] as unknown as CrudSvc;
  return {
    list: asyncHandler(async (req: Request, res: Response) => paginated(res, await svc.list(validatedQuery(req)))),
    getById: asyncHandler(async (req: Request, res: Response) => ok(res, await svc.getById(req.params.id))),
    create: asyncHandler(async (req: Request, res: Response) => created(res, await svc.create(req.body))),
    update: asyncHandler(async (req: Request, res: Response) => ok(res, await svc.update(req.params.id, req.body))),
    remove: asyncHandler(async (req: Request, res: Response) => {
      await svc.remove(req.params.id);
      return noContent(res);
    }),
  };
}

export const financeControllers = {
  cloudCost: crudController('cloudCost'),
  toolCost: crudController('toolCost'),
  teamCost: crudController('teamCost'),
  productCost: crudController('productCost'),
  techDebtCost: crudController('techDebtCost'),
  incidentCost: crudController('incidentCost'),
  costOfDelay: crudController('costOfDelay'),
  hiringRoi: crudController('hiringRoi'),
  engineeringCost: crudController('engineeringCost'),
};

export const financeAnalyticsController = {
  executive: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.executiveDashboard())),
  cloud: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.cloudAnalytics())),
  tools: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.toolAnalytics())),
  teams: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.teamCostAnalytics())),
  products: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.productCostAnalytics())),
  techDebt: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.techDebtCostAnalytics())),
  incidents: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.incidentCostAnalytics())),
  costOfDelay: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.costOfDelayAnalytics())),
  hiringRoi: asyncHandler(async (_req: Request, res: Response) => ok(res, await financeService.hiringRoiAnalytics())),
};

export const costAdvisorController = {
  advise: asyncHandler(async (_req: Request, res: Response) => ok(res, await costAdvisorService.advise())),
  weeklyReport: asyncHandler(async (_req: Request, res: Response) => ok(res, await costAdvisorService.weeklyExecutiveReport())),
};
