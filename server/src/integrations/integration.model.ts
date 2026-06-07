import { Schema, model, type InferSchemaType } from 'mongoose';

export const PROVIDERS = ['github', 'jira', 'pagerduty', 'cloud'] as const;
export type Provider = (typeof PROVIDERS)[number];

/**
 * Per-provider connection state. Single-org for now (one doc per provider).
 * `mode` toggles the data source: 'dummy' returns canned data, 'live' calls the
 * real API — swapping is a one-field change, no code edits.
 */
const integrationSchema = new Schema(
  {
    provider: { type: String, enum: PROVIDERS, required: true, unique: true },
    status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
    mode: { type: String, enum: ['dummy', 'live'], default: 'dummy' },
    // Real connection config (org/repos for GitHub, host/projectKeys for Jira).
    // Tokens would be stored encrypted here in 'live' mode.
    config: { type: Schema.Types.Mixed, default: {} },
    cursor: { type: String }, // incremental sync checkpoint
    lastSyncAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true },
);

export type IntegrationDoc = InferSchemaType<typeof integrationSchema>;
export const IntegrationModel = model<IntegrationDoc>('Integration', integrationSchema);
