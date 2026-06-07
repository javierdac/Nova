import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const keyResultSchema = z.object({
  title: z.string().min(2).max(200),
  metricType: z.enum(['percent', 'number', 'currency', 'boolean']).default('percent'),
  startValue: z.number().optional(),
  targetValue: z.number(),
  currentValue: z.number().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export const updateKeyResultSchema = keyResultSchema.partial();

export const createObjectiveSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  owner: objectId.optional(),
  team: objectId.optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'Expected YYYY-Qn'),
  level: z.enum(['company', 'team']).default('team'),
  keyResults: z.array(keyResultSchema).optional(),
  linkedProjects: z.array(objectId).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateObjectiveSchema = createObjectiveSchema.partial();

export const idParamSchema = z.object({ id: objectId });
export const krParamSchema = z.object({ id: objectId, krId: objectId });
export const projectParamSchema = z.object({ projectId: objectId });

export type CreateObjectiveDto = z.infer<typeof createObjectiveSchema>;
export type UpdateObjectiveDto = z.infer<typeof updateObjectiveSchema>;
export type KeyResultDto = z.infer<typeof keyResultSchema>;
