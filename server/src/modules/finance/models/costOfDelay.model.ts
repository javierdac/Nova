import { Schema, model, type InferSchemaType } from 'mongoose';

const costOfDelaySchema = new Schema(
  {
    featureName: { type: String, required: true, trim: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    expectedMonthlyRevenue: { type: Number, required: true, min: 0 },
    delayMonths: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['at_risk', 'delayed', 'shipped', 'cancelled'], default: 'at_risk', index: true },
    currency: { type: String, default: 'USD', uppercase: true },
    notes: { type: String, maxlength: 500 },
    // Derived: expectedMonthlyRevenue * delayMonths.
    estimatedCostOfDelay: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

costOfDelaySchema.index({ featureName: 'text', notes: 'text' });

function deriveCod(revenue: number, months: number) {
  return Number((revenue * months).toFixed(2));
}

costOfDelaySchema.pre('save', function (next) {
  this.estimatedCostOfDelay = deriveCod(this.expectedMonthlyRevenue ?? 0, this.delayMonths ?? 0);
  next();
});

costOfDelaySchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (!update) return next();
  if (update.expectedMonthlyRevenue !== undefined || update.delayMonths !== undefined) {
    const existing = await this.model.findOne(this.getQuery());
    const rev = update.expectedMonthlyRevenue ?? existing?.expectedMonthlyRevenue ?? 0;
    const m = update.delayMonths ?? existing?.delayMonths ?? 0;
    update.estimatedCostOfDelay = deriveCod(rev, m);
  }
  next();
});

export type CostOfDelayDoc = InferSchemaType<typeof costOfDelaySchema>;
export const CostOfDelayModel = model<CostOfDelayDoc>('CostOfDelay', costOfDelaySchema);
