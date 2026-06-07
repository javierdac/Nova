import { Schema, model, type InferSchemaType } from 'mongoose';

const hiringRoiSchema = new Schema(
  {
    role: { type: String, required: true, trim: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    seniority: { type: String, enum: ['junior', 'mid', 'senior', 'staff', 'principal'], default: 'mid' },
    annualCost: { type: Number, required: true, min: 0 },
    estimatedProductivityGain: { type: Number, default: 0 }, // % uplift to team output
    estimatedRevenueImpact: { type: Number, default: 0, min: 0 }, // annual
    currency: { type: String, default: 'USD', uppercase: true },
    status: { type: String, enum: ['proposed', 'approved', 'hired', 'rejected'], default: 'proposed', index: true },
    notes: { type: String, maxlength: 500 },
    // Derived ROI ratio: (revenueImpact - annualCost) / annualCost.
    estimatedROI: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

function deriveRoi(revenue: number, cost: number) {
  return cost > 0 ? Number((((revenue - cost) / cost) * 100).toFixed(1)) : 0;
}

hiringRoiSchema.pre('save', function (next) {
  this.estimatedROI = deriveRoi(this.estimatedRevenueImpact ?? 0, this.annualCost ?? 0);
  next();
});

hiringRoiSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (!update) return next();
  if (update.estimatedRevenueImpact !== undefined || update.annualCost !== undefined) {
    const existing = await this.model.findOne(this.getQuery());
    const rev = update.estimatedRevenueImpact ?? existing?.estimatedRevenueImpact ?? 0;
    const cost = update.annualCost ?? existing?.annualCost ?? 0;
    update.estimatedROI = deriveRoi(rev, cost);
  }
  next();
});

export type HiringRoiDoc = InferSchemaType<typeof hiringRoiSchema>;
export const HiringRoiModel = model<HiringRoiDoc>('HiringROI', hiringRoiSchema);
