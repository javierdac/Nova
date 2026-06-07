import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createComponentSchema = z.object({
  name: z.string().min(2).max(160),
  type: z.enum(['service', 'api', 'database', 'queue', 'cache', 'external', 'frontend', 'job']),
  description: z.string().max(2000).optional(),
  lifecycle: z.enum(['planned', 'active', 'deprecated', 'retired']).optional(),
  tier: z.enum(['tier1', 'tier2', 'tier3']).optional(),
  repoUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  runbookUrl: z.string().url().optional(),
  language: z.string().optional(),
  ownerTeam: objectId.optional(),
  ownerUser: objectId.optional(),
  dependencies: z.array(objectId).optional(),
  apiSpec: z
    .object({
      protocol: z.enum(['rest', 'graphql', 'grpc', 'soap', 'websocket']).optional(),
      version: z.string().optional(),
      baseUrl: z.string().optional(),
    })
    .optional(),
  dbSpec: z
    .object({ engine: z.string().optional(), version: z.string().optional(), multiTenant: z.boolean().optional() })
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const updateComponentSchema = createComponentSchema.partial();
export const idParamSchema = z.object({ id: objectId });

export type CreateComponentDto = z.infer<typeof createComponentSchema>;
export type UpdateComponentDto = z.infer<typeof updateComponentSchema>;
