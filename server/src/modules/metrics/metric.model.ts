import { Schema, model, type InferSchemaType } from 'mongoose';
import { sourceSchema } from '../../shared/source.js';

/**
 * Daily engineering metric snapshot per team. Powers the dashboard trend
 * charts (lead time, deployment frequency, incidents, capacity).
 */
const metricSnapshotSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    date: { type: Date, required: true, index: true },
    leadTimeHours: { type: Number, default: 0 }, // mean PR open -> deploy
    deploymentCount: { type: Number, default: 0 },
    deploymentFrequency: { type: Number, default: 0 }, // deploys/day
    changeFailureRate: { type: Number, default: 0 }, // 0-1
    incidentCount: { type: Number, default: 0 },
    mttrMinutes: { type: Number, default: 0 },
    availableCapacityHours: { type: Number, default: 0 },
    committedCapacityHours: { type: Number, default: 0 },
    source: { type: sourceSchema, default: () => ({ system: 'manual' }) },
  },
  { timestamps: true },
);

metricSnapshotSchema.index({ team: 1, date: -1 }, { unique: false });

export type MetricSnapshotDoc = InferSchemaType<typeof metricSnapshotSchema>;
export const MetricSnapshotModel = model<MetricSnapshotDoc>('MetricSnapshot', metricSnapshotSchema);
