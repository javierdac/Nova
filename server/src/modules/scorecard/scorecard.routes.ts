import { Router } from 'express';
import { z } from 'zod';
import { scorecardController } from './scorecard.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({ team: z.string().optional() }) }), scorecardController.compute);

export const scorecardRoutes = router;
