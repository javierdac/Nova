import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createOneOnOneSchema = z.object({
  report: objectId,
  manager: objectId.optional(), // defaults to the requesting user
  date: z.coerce.date().optional(),
  notes: z.string().max(8000).optional(),
  privateNotes: z.string().max(8000).optional(),
  mood: z.enum(['great', 'good', 'neutral', 'concerned', 'at_risk']).optional(),
  feedback: z
    .object({ strengths: z.string().max(2000).optional(), improvements: z.string().max(2000).optional() })
    .optional(),
  careerGrowth: z
    .object({
      currentLevel: z.string().optional(),
      targetLevel: z.string().optional(),
      plan: z.string().max(4000).optional(),
    })
    .optional(),
  goals: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(['performance', 'career', 'skill', 'project']).optional(),
        status: z.enum(['not_started', 'in_progress', 'achieved', 'dropped']).optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .optional(),
  actionItems: z
    .array(z.object({ title: z.string(), owner: z.enum(['manager', 'report']).optional(), done: z.boolean().optional() }))
    .optional(),
  nextMeetingDate: z.coerce.date().optional(),
});

export const updateOneOnOneSchema = createOneOnOneSchema.partial().omit({ report: true });
export const idParamSchema = z.object({ id: objectId });

export type CreateOneOnOneDto = z.infer<typeof createOneOnOneSchema>;
export type UpdateOneOnOneDto = z.infer<typeof updateOneOnOneSchema>;
