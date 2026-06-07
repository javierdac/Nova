import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const allocationQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  teamId: objectId.optional(),
});

export type AllocationQuery = z.infer<typeof allocationQuerySchema>;
