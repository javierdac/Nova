import { Router } from 'express';
import { z } from 'zod';
import { techDebtController } from './techDebt.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createTechDebtSchema, idParamSchema, updateTechDebtSchema } from './techDebt.dto.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({}).passthrough() }), techDebtController.list);
router.get('/matrix', techDebtController.matrix);
router.get('/:id', validate({ params: idParamSchema }), techDebtController.getById);
router.post('/', authorizeAtLeast('engineer'), validate({ body: createTechDebtSchema }), techDebtController.create);
router.patch('/:id', authorizeAtLeast('engineer'), validate({ params: idParamSchema, body: updateTechDebtSchema }), techDebtController.update);
router.delete('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema }), techDebtController.remove);

export const techDebtRoutes = router;
