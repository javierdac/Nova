import { Schema, model, type InferSchemaType } from 'mongoose';

/** A measurable key result inside an objective. */
const keyResultSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    metricType: { type: String, enum: ['percent', 'number', 'currency', 'boolean'], default: 'percent' },
    startValue: { type: Number, default: 0 },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 70 },
  },
  { _id: true },
);

/**
 * An OKR objective for a quarter, owned by a person and (optionally) scoped to a
 * team or set at company level. Progress and status are derived from the embedded
 * key results at read time (see okr.service rollup helpers).
 */
const objectiveSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    quarter: { type: String, required: true, index: true }, // e.g. "2026-Q2"
    level: { type: String, enum: ['company', 'team'], default: 'team', index: true },
    // Stored for filtering; recomputed from key results on read.
    status: { type: String, enum: ['on_track', 'at_risk', 'off_track', 'achieved'], default: 'on_track', index: true },
    keyResults: { type: [keyResultSchema], default: [] },
    linkedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

objectiveSchema.index({ title: 'text', description: 'text' });
objectiveSchema.set('toJSON', { virtuals: true });

export type ObjectiveDoc = InferSchemaType<typeof objectiveSchema>;
export const ObjectiveModel = model<ObjectiveDoc>('Objective', objectiveSchema);
