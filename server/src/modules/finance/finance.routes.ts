import { Router } from 'express';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  costAdvisorController,
  financeAnalyticsController,
  financeControllers,
} from './finance.controller.js';
import {
  createCloudCostSchema, updateCloudCostSchema,
  createToolCostSchema, updateToolCostSchema,
  createTeamCostSchema, updateTeamCostSchema,
  createProductCostSchema, updateProductCostSchema,
  createTechDebtCostSchema, updateTechDebtCostSchema,
  createIncidentCostSchema, updateIncidentCostSchema,
  createCostOfDelaySchema, updateCostOfDelaySchema,
  createHiringRoiSchema, updateHiringRoiSchema,
  createEngineeringCostSchema, updateEngineeringCostSchema,
  idParamSchema, listQuerySchema,
} from './finance.dto.js';
import type { financeControllers as Controllers } from './finance.controller.js';

const router = Router();

// RBAC: Finance is leadership-only. Developers/viewers have NO access.
// EM and up can read; Head of Engineering and up can write.
router.use(authenticate);
router.use(authorizeAtLeast('engineering_manager'));

const READ = authorizeAtLeast('engineering_manager');
const WRITE = authorizeAtLeast('head_of_engineering');

/** Registers REST CRUD routes for a finance resource at `path`. */
function mountCrud(
  path: string,
  controller: (typeof Controllers)[keyof typeof Controllers],
  schemas: { create: import('zod').ZodTypeAny; update: import('zod').ZodTypeAny },
) {
  router.get(`${path}`, READ, validate({ query: listQuerySchema }), controller.list);
  router.get(`${path}/:id`, READ, validate({ params: idParamSchema }), controller.getById);
  router.post(`${path}`, WRITE, validate({ body: schemas.create }), controller.create);
  router.patch(`${path}/:id`, WRITE, validate({ params: idParamSchema, body: schemas.update }), controller.update);
  router.delete(`${path}/:id`, WRITE, validate({ params: idParamSchema }), controller.remove);
}

/* ── Analytics dashboards (read) ───────────────────────── */
router.get('/dashboard/executive', READ, financeAnalyticsController.executive);
router.get('/dashboard/cloud', READ, financeAnalyticsController.cloud);
router.get('/dashboard/tools', READ, financeAnalyticsController.tools);
router.get('/dashboard/teams', READ, financeAnalyticsController.teams);
router.get('/dashboard/products', READ, financeAnalyticsController.products);
router.get('/dashboard/tech-debt', READ, financeAnalyticsController.techDebt);
router.get('/dashboard/incidents', READ, financeAnalyticsController.incidents);
router.get('/dashboard/cost-of-delay', READ, financeAnalyticsController.costOfDelay);
router.get('/dashboard/hiring-roi', READ, financeAnalyticsController.hiringRoi);

/* ── AI Cost Advisor (read, EM+) ───────────────────────── */
router.get('/advisor/recommendations', READ, costAdvisorController.advise);
router.get('/advisor/weekly-report', READ, costAdvisorController.weeklyReport);

/* ── CRUD resources ────────────────────────────────────── */
mountCrud('/engineering-costs', financeControllers.engineeringCost, { create: createEngineeringCostSchema, update: updateEngineeringCostSchema });
mountCrud('/cloud-costs', financeControllers.cloudCost, { create: createCloudCostSchema, update: updateCloudCostSchema });
mountCrud('/tool-costs', financeControllers.toolCost, { create: createToolCostSchema, update: updateToolCostSchema });
mountCrud('/team-costs', financeControllers.teamCost, { create: createTeamCostSchema, update: updateTeamCostSchema });
mountCrud('/product-costs', financeControllers.productCost, { create: createProductCostSchema, update: updateProductCostSchema });
mountCrud('/tech-debt-costs', financeControllers.techDebtCost, { create: createTechDebtCostSchema, update: updateTechDebtCostSchema });
mountCrud('/incident-costs', financeControllers.incidentCost, { create: createIncidentCostSchema, update: updateIncidentCostSchema });
mountCrud('/cost-of-delay', financeControllers.costOfDelay, { create: createCostOfDelaySchema, update: updateCostOfDelaySchema });
mountCrud('/hiring-roi', financeControllers.hiringRoi, { create: createHiringRoiSchema, update: updateHiringRoiSchema });

export const financeRoutes = router;
