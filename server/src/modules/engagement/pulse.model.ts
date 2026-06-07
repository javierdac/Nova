import { Schema, model, type InferSchemaType } from 'mongoose';

export const PULSE_DIMENSIONS = ['workload', 'clarity', 'growth', 'management'] as const;

/**
 * One anonymous pulse-survey response. eNPS is derived from `recommendScore`
 * (0–10): promoters 9–10, passives 7–8, detractors 0–6. Dimensions are 1–10.
 * Anonymous by design (no user ref) so people answer honestly.
 */
const pulseResponseSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    period: { type: String, required: true, match: /^\d{4}-\d{2}$/, index: true }, // YYYY-MM
    recommendScore: { type: Number, required: true, min: 0, max: 10 },
    dimensions: {
      workload: { type: Number, min: 1, max: 10, default: 5 },
      clarity: { type: Number, min: 1, max: 10, default: 5 },
      growth: { type: Number, min: 1, max: 10, default: 5 },
      management: { type: Number, min: 1, max: 10, default: 5 },
    },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

pulseResponseSchema.index({ period: 1, team: 1 });

export type PulseResponseDoc = InferSchemaType<typeof pulseResponseSchema>;
export const PulseResponseModel = model<PulseResponseDoc>('PulseResponse', pulseResponseSchema);
