import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const seniority = z.enum(['intern', 'junior', 'mid', 'senior', 'staff', 'principal']);

export const createPositionSchema = z.object({
  title: z.string().min(2).max(160),
  team: objectId.optional(),
  seniority: seniority.optional(),
  status: z.enum(['planned', 'open', 'interviewing', 'offer', 'filled', 'frozen']).optional(),
  budgetedMonthlyCost: z.number().min(0).optional(),
  openedAt: z.coerce.date().optional(),
  targetStartDate: z.coerce.date().optional(),
  filledBy: objectId.optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePositionSchema = createPositionSchema.partial().extend({
  filledAt: z.coerce.date().optional(),
});

export const candidateSchema = z.object({
  name: z.string().min(2).max(120),
  stage: z.enum(['applied', 'screen', 'onsite', 'offer', 'hired', 'rejected']).default('applied'),
  appliedAt: z.coerce.date().optional(),
  note: z.string().max(280).optional(),
});

export const createSkillSchema = z.object({
  user: objectId,
  skill: z.string().min(1).max(80),
  category: z.enum(['language', 'framework', 'platform', 'domain', 'soft', 'tooling']).optional(),
  level: z.number().min(1).max(5).optional(),
  interest: z.number().min(1).max(5).optional(),
});

export const updateSkillSchema = createSkillSchema.partial();

export const idParamSchema = z.object({ id: objectId });

export type CreatePositionDto = z.infer<typeof createPositionSchema>;
export type UpdatePositionDto = z.infer<typeof updatePositionSchema>;
export type CandidateDto = z.infer<typeof candidateSchema>;
export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;
