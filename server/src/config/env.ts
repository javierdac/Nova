import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Integraciones live (opcionales; sin credenciales, el provider corre en modo dummy).
  PAGERDUTY_API_TOKEN: z.string().optional(),
  // Jira Cloud: host (https://acme.atlassian.net) + email + API token (Basic auth).
  JIRA_BASE_URL: z.string().optional(),
  JIRA_EMAIL: z.string().optional(),
  JIRA_API_TOKEN: z.string().optional(),
  JIRA_JQL: z.string().default('ORDER BY updated DESC'),
  JIRA_STORY_POINTS_FIELD: z.string().default('customfield_10016'),
  // GitHub: PAT + lista de repos "owner/repo" separada por comas. API URL para GHE.
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPOS: z.string().optional(),
  GITHUB_API_URL: z.string().default('https://api.github.com'),
  // Cloud billing: endpoint de export (CUR/BigQuery export/FinOps tool) que
  // devuelve filas de costo en JSON. Token opcional (Bearer).
  CLOUD_BILLING_URL: z.string().optional(),
  CLOUD_BILLING_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
