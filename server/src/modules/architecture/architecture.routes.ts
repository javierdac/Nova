import { Router } from 'express';
import { z } from 'zod';
import { architectureController } from './architecture.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createComponentSchema, idParamSchema, updateComponentSchema } from './architecture.dto.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({}).passthrough() }), architectureController.list);
router.get('/graph', architectureController.graph);
router.get('/:id', validate({ params: idParamSchema }), architectureController.getById);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createComponentSchema }), architectureController.create);
router.patch('/:id', authorizeAtLeast('engineer'), validate({ params: idParamSchema, body: updateComponentSchema }), architectureController.update);
router.delete('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema }), architectureController.remove);

export const architectureRoutes = router;
