import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const score = z.number().int().min(1).max(10);

export const createTechDebtSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional(),
  category: z
    .enum(['architecture', 'code_quality', 'testing', 'infrastructure', 'security', 'documentation', 'dependencies'])
    .optional(),
  status: z.enum(['identified', 'accepted', 'in_progress', 'resolved', 'wont_fix']).optional(),
  team: objectId.optional(),
  component: objectId.optional(),
  owner: objectId.optional(),
  impactScore: score,
  riskScore: score,
  effortScore: score,
  tags: z.array(z.string()).optional(),
});

export const updateTechDebtSchema = createTechDebtSchema.partial();
export const idParamSchema = z.object({ id: objectId });

export type CreateTechDebtDto = z.infer<typeof createTechDebtSchema>;
export type UpdateTechDebtDto = z.infer<typeof updateTechDebtSchema>;
