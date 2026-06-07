import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/summary', dashboardController.summary);
router.get('/trends', dashboardController.trends);

export const dashboardRoutes = router;
