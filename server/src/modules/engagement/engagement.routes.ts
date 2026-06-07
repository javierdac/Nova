import { Router } from 'express';
import { engagementController } from './engagement.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createPulseSchema, summaryQuerySchema } from './engagement.dto.js';

const router = Router();
router.use(authenticate);

router.get('/summary', validate({ query: summaryQuerySchema }), engagementController.summary);
// Anyone authenticated can submit a pulse response (it's anonymous).
router.post('/responses', authorizeAtLeast('engineer'), validate({ body: createPulseSchema }), engagementController.create);

export const engagementRoutes = router;
