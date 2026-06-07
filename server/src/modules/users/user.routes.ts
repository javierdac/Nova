import { Router } from 'express';
import { userController } from './user.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { createUserSchema, idParamSchema, listUsersQuerySchema, setCompensationSchema, updateUserSchema } from './user.dto.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listUsersQuerySchema }), userController.list);
router.get('/:id', validate({ params: idParamSchema }), userController.getById);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createUserSchema }), userController.create);
router.patch(
  '/:id',
  authorizeAtLeast('engineering_manager'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update,
);
// Per-person compensation. Read = finance-read (engineering_manager+),
// write = finance-write (head_of_engineering+). Mirrors the finance module RBAC.
router.get('/:id/compensation', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema }), userController.getCompensation);
router.put(
  '/:id/compensation',
  authorizeAtLeast('head_of_engineering'),
  validate({ params: idParamSchema, body: setCompensationSchema }),
  userController.setCompensation,
);

router.post('/:id/deactivate', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), userController.deactivate);
router.delete('/:id', authorizeAtLeast('admin'), validate({ params: idParamSchema }), userController.remove);

export const userRoutes = router;
