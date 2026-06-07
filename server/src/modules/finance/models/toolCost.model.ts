import { Schema, model, type InferSchemaType } from 'mongoose';

const toolCostSchema = new Schema(
  {
    toolName: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['communication', 'source_control', 'observability', 'design', 'project_mgmt', 'docs', 'security', 'other'],
      default: 'other',
      index: true,
    },
    monthlyCost: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    activeLicenses: { type: Number, default: 0, min: 0 },
    usedLicenses: { type: Number, default: 0, min: 0 },
    renewalDate: { type: Date, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    // Derived utilization (0-100) and wasted spend, computed on save.
    utilization: { type: Number, default: 0 },
    wastedMonthlySpend: { type: Number, default: 0, index: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

toolCostSchema.index({ toolName: 'text', notes: 'text' });

function deriveUtilization(active: number, used: number, monthlyCost: number) {
  const utilization = active > 0 ? Math.round((Math.min(used, active) / active) * 100) : 0;
  const perLicense = active > 0 ? monthlyCost / active : 0;
  const wastedMonthlySpend = Number((Math.max(0, active - used) * perLicense).toFixed(2));
  return { utilization, wastedMonthlySpend };
}

toolCostSchema.pre('save', function (next) {
  Object.assign(this, deriveUtilization(this.activeLicenses ?? 0, this.usedLicenses ?? 0, this.monthlyCost));
  next();
});

toolCostSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (!update) return next();
  const existing = await this.model.findOne(this.getQuery());
  if (existing) {
    const active = update.activeLicenses ?? existing.activeLicenses ?? 0;
    const used = update.usedLicenses ?? existing.usedLicenses ?? 0;
    const cost = update.monthlyCost ?? existing.monthlyCost ?? 0;
    Object.assign(update, deriveUtilization(active, used, cost));
  }
  next();
});

export type ToolCostDoc = InferSchemaType<typeof toolCostSchema>;
export const ToolCostModel = model<ToolCostDoc>('ToolCost', toolCostSchema);
