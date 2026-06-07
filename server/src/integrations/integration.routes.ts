import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorizeAtLeast } from '../shared/middleware/auth.js';
import { validate } from '../shared/middleware/validate.js';
import { integrationController } from './integration.controller.js';
import { PROVIDERS } from './integration.model.js';

const router = Router();
router.use(authenticate);

const providerParam = z.object({ provider: z.enum(PROVIDERS as unknown as [string, ...string[]]) });
const configureBody = z.object({
  mode: z.enum(['dummy', 'live']).optional(),
  status: z.enum(['connected', 'disconnected']).optional(),
});

// Read: EM and up. Manage/sync: Head of Engineering and up.
router.get('/', authorizeAtLeast('engineering_manager'), integrationController.list);
router.get('/:provider/runs', authorizeAtLeast('engineering_manager'), validate({ params: providerParam }), integrationController.runs);
router.patch('/:provider', authorizeAtLeast('head_of_engineering'), validate({ params: providerParam, body: configureBody }), integrationController.configure);
router.post('/:provider/sync', authorizeAtLeast('head_of_engineering'), validate({ params: providerParam }), integrationController.sync);

export const integrationRoutes = router;
