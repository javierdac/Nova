import { Schema, model, type InferSchemaType } from 'mongoose';

const productCostSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true, index: true },
    payrollAllocation: { type: Number, default: 0, min: 0 },
    infrastructureAllocation: { type: Number, default: 0, min: 0 },
    toolingAllocation: { type: Number, default: 0, min: 0 },
    monthlyRevenue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    // Derived.
    totalCost: { type: Number, default: 0, index: true },
    grossMargin: { type: Number, default: 0 }, // revenue - cost
    profitabilityIndex: { type: Number, default: 0 }, // revenue / cost
  },
  { timestamps: true },
);

productCostSchema.index({ product: 1, year: 1, month: 1 }, { unique: true });

productCostSchema.pre('save', function (next) {
  this.totalCost = (this.payrollAllocation ?? 0) + (this.infrastructureAllocation ?? 0) + (this.toolingAllocation ?? 0);
  this.grossMargin = Number(((this.monthlyRevenue ?? 0) - this.totalCost).toFixed(2));
  this.profitabilityIndex = this.totalCost > 0 ? Number(((this.monthlyRevenue ?? 0) / this.totalCost).toFixed(2)) : 0;
  next();
});

export type ProductCostDoc = InferSchemaType<typeof productCostSchema>;
export const ProductCostModel = model<ProductCostDoc>('ProductCost', productCostSchema);
