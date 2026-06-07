import { Schema, model, type InferSchemaType } from 'mongoose';

const incidentCostSchema = new Schema(
  {
    incident: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    severity: { type: String, enum: ['SEV1', 'SEV2', 'SEV3', 'SEV4'], index: true },
    engineersInvolved: { type: Number, required: true, min: 0 },
    durationHours: { type: Number, required: true, min: 0 },
    estimatedHourlyRate: { type: Number, required: true, min: 0 },
    customerImpactScore: { type: Number, min: 0, max: 10, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    // Derived: engineersInvolved * durationHours * estimatedHourlyRate.
    estimatedCost: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

incidentCostSchema.pre('save', function (next) {
  this.estimatedCost = Number(
    ((this.engineersInvolved ?? 0) * (this.durationHours ?? 0) * (this.estimatedHourlyRate ?? 0)).toFixed(2),
  );
  next();
});

incidentCostSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (!update) return next();
  const existing = await this.model.findOne(this.getQuery());
  const e = update.engineersInvolved ?? existing?.engineersInvolved ?? 0;
  const d = update.durationHours ?? existing?.durationHours ?? 0;
  const r = update.estimatedHourlyRate ?? existing?.estimatedHourlyRate ?? 0;
  update.estimatedCost = Number((e * d * r).toFixed(2));
  next();
});

export type IncidentCostDoc = InferSchemaType<typeof incidentCostSchema>;
export const IncidentCostModel = model<IncidentCostDoc>('IncidentCost', incidentCostSchema);
