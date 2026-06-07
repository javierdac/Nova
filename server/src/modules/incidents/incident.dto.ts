import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createIncidentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional(),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']),
  status: z.enum(['open', 'investigating', 'identified', 'monitoring', 'mitigated', 'resolved']).optional(),
  service: objectId.optional(),
  team: objectId.optional(),
  project: objectId.optional(),
  commander: objectId.optional(),
  detectedAt: z.coerce.date().optional(),
  affectedUsers: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateIncidentSchema = createIncidentSchema.partial();

export const timelineEntrySchema = z.object({
  type: z.enum(['detected', 'update', 'mitigated', 'resolved', 'note']).default('update'),
  message: z.string().min(1).max(2000),
  at: z.coerce.date().optional(),
});

export const postmortemSchema = z.object({
  summary: z.string().max(4000).optional(),
  rootCause: z.string().max(4000).optional(),
  impact: z.string().max(2000).optional(),
  resolution: z.string().max(4000).optional(),
  lessonsLearned: z.string().max(4000).optional(),
  actionItems: z
    .array(
      z.object({
        title: z.string(),
        owner: objectId.optional(),
        dueDate: z.coerce.date().optional(),
        status: z.enum(['open', 'in_progress', 'done']).optional(),
      }),
    )
    .optional(),
  publish: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: objectId });

export type CreateIncidentDto = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentDto = z.infer<typeof updateIncidentSchema>;
export type TimelineEntryDto = z.infer<typeof timelineEntrySchema>;
export type PostmortemDto = z.infer<typeof postmortemSchema>;
