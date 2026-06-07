import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  mission: z.string().max(500).optional(),
  lead: objectId.optional(),
  members: z.array(objectId).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  signals: z
    .object({
      morale: z.number().min(0).max(100).optional(),
      velocityConfidence: z.number().min(0).max(100).optional(),
      onCallLoad: z.number().min(0).max(100).optional(),
      attrition: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export const assignMembersSchema = z.object({
  members: z.array(objectId).min(0),
});

export const ptoSchema = z.object({
  user: objectId,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  type: z.enum(['vacation', 'sick', 'parental', 'other']).default('vacation'),
  note: z.string().max(280).optional(),
});

export const idParamSchema = z.object({ id: objectId });

export type CreateTeamDto = z.infer<typeof createTeamSchema>;
export type UpdateTeamDto = z.infer<typeof updateTeamSchema>;
export type PtoDto = z.infer<typeof ptoSchema>;
