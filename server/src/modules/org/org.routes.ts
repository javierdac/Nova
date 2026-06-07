import { Router } from 'express';
import { z } from 'zod';
import { orgController } from './org.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import {
  candidateSchema,
  createPositionSchema,
  createSkillSchema,
  idParamSchema,
  updatePositionSchema,
  updateSkillSchema,
} from './org.dto.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({}).passthrough();

/* ── Analytics / derived views ───────────────────────── */
router.get('/headcount', orgController.headcount);
router.get('/positions/funnel', orgController.funnel);
router.get('/skills/matrix', orgController.skillsMatrix);
router.get('/chart', orgController.chart);
router.get('/attrition-risk', orgController.attritionRisk);

/* ── Positions / hiring ──────────────────────────────── */
router.get('/positions', validate({ query: listQuery }), orgController.listPositions);
router.post('/positions', authorizeAtLeast('engineering_manager'), validate({ body: createPositionSchema }), orgController.createPosition);
router.patch('/positions/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updatePositionSchema }), orgController.updatePosition);
router.post('/positions/:id/candidates', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: candidateSchema }), orgController.addCandidate);
router.delete('/positions/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), orgController.removePosition);

/* ── Skills ──────────────────────────────────────────── */
router.get('/skills', validate({ query: listQuery }), orgController.listSkills);
router.post('/skills', authorizeAtLeast('engineering_manager'), validate({ body: createSkillSchema }), orgController.createSkill);
router.patch('/skills/:id', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: updateSkillSchema }), orgController.updateSkill);
router.delete('/skills/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), orgController.removeSkill);

export const orgRoutes = router;
