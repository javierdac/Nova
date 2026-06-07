import { Schema, model, type InferSchemaType } from 'mongoose';
import { PROVIDERS } from './integration.model.js';

/** One row per sync execution — observability + UI "last run" badge. */
const syncRunSchema = new Schema(
  {
    provider: { type: String, enum: PROVIDERS, required: true, index: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    mode: { type: String, enum: ['dummy', 'live'] },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true },
);

syncRunSchema.index({ provider: 1, createdAt: -1 });

export type SyncRunDoc = InferSchemaType<typeof syncRunSchema>;
export const SyncRunModel = model<SyncRunDoc>('SyncRun', syncRunSchema);
