import { Schema, model, type InferSchemaType } from 'mongoose';

/** A candidate moving through the hiring pipeline for a position. */
const candidateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    stage: {
      type: String,
      enum: ['applied', 'screen', 'onsite', 'offer', 'hired', 'rejected'],
      default: 'applied',
    },
    appliedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 280 },
  },
  { _id: true, timestamps: true },
);

/**
 * An open or planned headcount slot. Combines headcount planning (budget,
 * target start) with the hiring pipeline (embedded candidates).
 */
const positionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    seniority: {
      type: String,
      enum: ['intern', 'junior', 'mid', 'senior', 'staff', 'principal'],
      default: 'mid',
    },
    status: {
      type: String,
      enum: ['planned', 'open', 'interviewing', 'offer', 'filled', 'frozen'],
      default: 'open',
      index: true,
    },
    budgetedMonthlyCost: { type: Number, default: 0, min: 0 },
    openedAt: { type: Date, default: Date.now },
    targetStartDate: { type: Date },
    filledAt: { type: Date },
    filledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pipeline: { type: [candidateSchema], default: [] },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

positionSchema.index({ title: 'text', notes: 'text' });
positionSchema.set('toJSON', { virtuals: true });

export type PositionDoc = InferSchemaType<typeof positionSchema>;
export const PositionModel = model<PositionDoc>('Position', positionSchema);
