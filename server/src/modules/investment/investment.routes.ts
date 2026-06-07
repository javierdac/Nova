import { Router } from 'express';
import { investmentController } from './investment.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.js';
import { allocationQuerySchema } from './investment.dto.js';

const router = Router();
router.use(authenticate);

router.get('/allocation', validate({ query: allocationQuerySchema }), investmentController.allocation);
router.get('/trend', validate({ query: allocationQuerySchema }), investmentController.trend);

export const investmentRoutes = router;
