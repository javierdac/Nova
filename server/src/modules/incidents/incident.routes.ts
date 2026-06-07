import { Router } from 'express';
import { z } from 'zod';
import { incidentController } from './incident.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorizeAtLeast } from '../../shared/middleware/auth.js';
import {
  createIncidentSchema,
  idParamSchema,
  postmortemSchema,
  timelineEntrySchema,
  updateIncidentSchema,
} from './incident.dto.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({}).passthrough() }), incidentController.list);
router.get('/:id', validate({ params: idParamSchema }), incidentController.getById);
router.post('/', authorizeAtLeast('engineer'), validate({ body: createIncidentSchema }), incidentController.create);
router.patch('/:id', authorizeAtLeast('engineer'), validate({ params: idParamSchema, body: updateIncidentSchema }), incidentController.update);
router.post('/:id/timeline', authorizeAtLeast('engineer'), validate({ params: idParamSchema, body: timelineEntrySchema }), incidentController.addTimeline);
router.put('/:id/postmortem', authorizeAtLeast('engineering_manager'), validate({ params: idParamSchema, body: postmortemSchema }), incidentController.postmortem);
router.delete('/:id', authorizeAtLeast('head_of_engineering'), validate({ params: idParamSchema }), incidentController.remove);

export const incidentRoutes = router;
