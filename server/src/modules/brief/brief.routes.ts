import { Router } from 'express';
import { z } from 'zod';
import { briefController } from './brief.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/weekly', validate({ query: z.object({ team: z.string().optional() }) }), briefController.weekly);

export const briefRoutes = router;
