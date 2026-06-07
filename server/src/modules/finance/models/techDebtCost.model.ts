import { Schema, model, type InferSchemaType } from 'mongoose';

const techDebtCostSchema = new Schema(
  {
    technicalDebt: { type: Schema.Types.ObjectId, ref: 'TechDebt', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    hoursLostPerMonth: { type: Number, required: true, min: 0 },
    averageHourlyRate: { type: Number, required: true, min: 0 },
    impactLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    currency: { type: String, default: 'USD', uppercase: true },
    // Derived: hoursLostPerMonth * averageHourlyRate.
    estimatedMonthlyCost: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

techDebtCostSchema.pre('save', function (next) {
  this.estimatedMonthlyCost = Number(((this.hoursLostPerMonth ?? 0) * (this.averageHourlyRate ?? 0)).toFixed(2));
  next();
});

techDebtCostSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (!update) return next();
  if (update.hoursLostPerMonth !== undefined || update.averageHourlyRate !== undefined) {
    const existing = await this.model.findOne(this.getQuery());
    const hours = update.hoursLostPerMonth ?? existing?.hoursLostPerMonth ?? 0;
    const rate = update.averageHourlyRate ?? existing?.averageHourlyRate ?? 0;
    update.estimatedMonthlyCost = Number((hours * rate).toFixed(2));
  }
  next();
});

export type TechDebtCostDoc = InferSchemaType<typeof techDebtCostSchema>;
export const TechDebtCostModel = model<TechDebtCostDoc>('TechnicalDebtCost', techDebtCostSchema);
