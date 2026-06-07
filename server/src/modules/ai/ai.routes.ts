import { Router } from 'express';
import { z } from 'zod';
import { aiController } from './ai.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);

const teamIdParam = z.object({ teamId: z.string().regex(/^[a-f\d]{24}$/i) });

router.get('/status', aiController.status);
// AI insights are leadership-facing.
router.get('/weekly-summary', authorizeAtLeast('engineering_manager'), aiController.weeklySummary);
router.get('/team-risk/:teamId', authorizeAtLeast('engineering_manager'), validate({ params: teamIdParam }), aiController.teamRisk);
router.get('/burnout', authorizeAtLeast('engineering_manager'), aiController.burnout);
router.get('/tech-debt', authorizeAtLeast('engineering_manager'), aiController.techDebt);
router.get('/roadmap-risk', authorizeAtLeast('head_of_engineering'), aiController.roadmapRisk);
router.get('/health-report', authorizeAtLeast('engineering_manager'), aiController.healthReport);

export const aiRoutes = router;
