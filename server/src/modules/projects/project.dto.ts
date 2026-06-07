import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createProjectSchema = z.object({
  name: z.string().min(2).max(160),
  key: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['discovery', 'planned', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  investmentCategory: z.enum(['new_value', 'ktlo']).optional(),
  team: objectId.optional(),
  owner: objectId.optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  progress: z.number().min(0).max(100).optional(),
  roadmapHealth: z.enum(['on_track', 'at_risk', 'off_track']).optional(),
  riskNotes: z.string().max(1000).optional(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        dueDate: z.coerce.date().optional(),
        status: z.enum(['planned', 'in_progress', 'done', 'blocked']).optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
export const idParamSchema = z.object({ id: objectId });

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
