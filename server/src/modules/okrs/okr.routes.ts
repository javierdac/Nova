import { Router } from 'express';
import { z } from 'zod';
import { okrController } from './okr.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import {
  createObjectiveSchema,
  idParamSchema,
  keyResultSchema,
  krParamSchema,
  projectParamSchema,
  updateKeyResultSchema,
  updateObjectiveSchema,
} from './okr.dto.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({}).passthrough();

/* ── Rollup & delivery forecast ──────────────────────── */
router.get('/rollup', validate({ query: listQuery }), okrController.rollup);
router.get('/forecast', okrController.forecastAll);
router.get('/forecast/:projectId', validate({ params: projectParamSchema }), okrController.forecastOne);

/* ── Objectives ──────────────────────────────────────── */
router.get('/', validate({ query: listQuery }), okrController.list);
router.get('/:id', validate({ params: idParamSchema }), okrController.getById);
router.post('/', authorizeAtLeast('engineering_manager'), validate({ body: createObjectiveSchema }), okrController.create);
router.patch('/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updateObjectiveSchema }), okrController.update);
router.delete('/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), okrController.remove);
router.post('/:id/key-results', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: keyResultSchema }), okrController.addKeyResult);
router.patch('/:id/key-results/:krId', authorizeAtLeast('engineering_manager'), validate({ params: krParamSchema, body: updateKeyResultSchema }), okrController.updateKeyResult);

export const okrRoutes = router;
