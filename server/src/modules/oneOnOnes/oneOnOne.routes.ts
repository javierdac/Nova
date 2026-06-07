import { Router } from 'express';
import { z } from 'zod';
import { oneOnOneController } from './oneOnOne.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createOneOnOneSchema, idParamSchema, updateOneOnOneSchema } from './oneOnOne.dto.js';

const router = Router();
router.use(authenticate);

// One-on-ones are a management tool; require at least EM to create.
router.get('/', validate({ query: z.object({}).passthrough() }), oneOnOneController.list);
router.get('/:id', validate({ params: idParamSchema }), oneOnOneController.getById);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createOneOnOneSchema }), oneOnOneController.create);
router.patch('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updateOneOnOneSchema }), oneOnOneController.update);
router.delete('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema }), oneOnOneController.remove);

export const oneOnOneRoutes = router;
