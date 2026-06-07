import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const score10 = z.number().int().min(1).max(10);

export const createPulseSchema = z.object({
  team: objectId.optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
  recommendScore: z.number().int().min(0).max(10),
  dimensions: z
    .object({
      workload: score10,
      clarity: score10,
      growth: score10,
      management: score10,
    })
    .optional(),
  comment: z.string().max(1000).optional(),
});

export const summaryQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  teamId: objectId.optional(),
});

export type CreatePulseDto = z.infer<typeof createPulseSchema>;
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
