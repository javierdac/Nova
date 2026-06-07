import { Router } from 'express';
import { teamController } from './team.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import { assignMembersSchema, createTeamSchema, idParamSchema, ptoSchema, updateTeamSchema } from './team.dto.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const listQuery = z.object({}).passthrough();
const ptoParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i), ptoId: z.string().regex(/^[a-f\d]{24}$/i) });

router.get('/', validate({ query: listQuery }), teamController.list);
router.get('/:id', validate({ params: idParamSchema }), teamController.getById);
router.get('/:id/capacity', validate({ params: idParamSchema }), teamController.capacity);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createTeamSchema }), teamController.create);
router.patch('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updateTeamSchema }), teamController.update);
router.put('/:id/members', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: assignMembersSchema }), teamController.assignMembers);
router.post('/:id/pto', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: ptoSchema }), teamController.addPto);
router.delete('/:id/pto/:ptoId', authorizeAtLeast('engineering_manager'), validate({ params: ptoParam }), teamController.removePto);
router.delete('/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), teamController.remove);

export const teamRoutes = router;
