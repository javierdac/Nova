import { Router } from 'express';
import { z } from 'zod';
import { projectController } from './project.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createProjectSchema, idParamSchema, updateProjectSchema } from './project.dto.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({}).passthrough() }), projectController.list);
router.get('/:id', validate({ params: idParamSchema }), projectController.getById);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createProjectSchema }), projectController.create);
router.patch('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updateProjectSchema }), projectController.update);
router.delete('/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), projectController.remove);

export const projectRoutes = router;
