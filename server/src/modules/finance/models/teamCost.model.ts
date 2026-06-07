import { Schema, model, type InferSchemaType } from 'mongoose';

const teamCostSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true, index: true },
    payrollCost: { type: Number, default: 0, min: 0 },
    infrastructureAllocation: { type: Number, default: 0, min: 0 },
    toolingAllocation: { type: Number, default: 0, min: 0 },
    contractorCost: { type: Number, default: 0, min: 0 },
    headcount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    // Derived totals.
    totalCost: { type: Number, default: 0, index: true },
    costPerEngineer: { type: Number, default: 0 },
  },
  { timestamps: true },
);

teamCostSchema.index({ team: 1, year: 1, month: 1 }, { unique: true });

teamCostSchema.pre('save', function (next) {
  this.totalCost = (this.payrollCost ?? 0) + (this.infrastructureAllocation ?? 0) + (this.toolingAllocation ?? 0) + (this.contractorCost ?? 0);
  this.costPerEngineer = this.headcount && this.headcount > 0 ? Number((this.totalCost / this.headcount).toFixed(2)) : 0;
  next();
});

export type TeamCostDoc = InferSchemaType<typeof teamCostSchema>;
export const TeamCostModel = model<TeamCostDoc>('TeamCost', teamCostSchema);
