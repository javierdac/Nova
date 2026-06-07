import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Top-level monthly engineering cost ledger used by the executive cost
 * dashboard. Aggregates the four cost categories per month.
 */
const engineeringCostSchema = new Schema(
  {
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true, index: true },
    payrollCost: { type: Number, default: 0, min: 0 },
    infrastructureCost: { type: Number, default: 0, min: 0 },
    saasToolsCost: { type: Number, default: 0, min: 0 },
    contractorsCost: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    totalCost: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

engineeringCostSchema.index({ year: 1, month: 1 }, { unique: true });

engineeringCostSchema.pre('save', function (next) {
  this.totalCost =
    (this.payrollCost ?? 0) + (this.infrastructureCost ?? 0) + (this.saasToolsCost ?? 0) + (this.contractorsCost ?? 0);
  next();
});

export type EngineeringCostDoc = InferSchemaType<typeof engineeringCostSchema>;
export const EngineeringCostModel = model<EngineeringCostDoc>('EngineeringCost', engineeringCostSchema);
