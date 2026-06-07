import { Schema, model, type InferSchemaType } from 'mongoose';
import { sourceSchema } from '../../../shared/source.js';

export const CLOUD_PROVIDERS = ['AWS', 'GCP', 'Azure', 'Cloudflare', 'MongoDB Atlas', 'Vercel', 'Railway'] as const;

const cloudCostSchema = new Schema(
  {
    provider: { type: String, enum: CLOUD_PROVIDERS, required: true, index: true },
    service: { type: String, required: true, trim: true },
    month: { type: Number, min: 1, max: 12, required: true, index: true },
    year: { type: Number, min: 2000, max: 2100, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    notes: { type: String, maxlength: 500 },
    // Provenance: 'manual' (entered in Nova) or synced from a cloud billing export.
    source: { type: sourceSchema, default: () => ({ system: 'manual' }) },
  },
  { timestamps: true },
);

cloudCostSchema.index({ provider: 'text', service: 'text', notes: 'text' });
cloudCostSchema.index({ year: 1, month: 1, provider: 1 });

export type CloudCostDoc = InferSchemaType<typeof cloudCostSchema>;
export const CloudCostModel = model<CloudCostDoc>('CloudCost', cloudCostSchema);
