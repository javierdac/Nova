import { Schema, model, type InferSchemaType } from 'mongoose';
import { sourceSchema } from '../../shared/source.js';

const timelineEntrySchema = new Schema(
  {
    at: { type: Date, required: true, default: () => new Date() },
    type: { type: String, enum: ['detected', 'update', 'mitigated', 'resolved', 'note'], default: 'update' },
    message: { type: String, required: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const postmortemSchema = new Schema(
  {
    summary: { type: String, maxlength: 4000 },
    rootCause: { type: String, maxlength: 4000 },
    impact: { type: String, maxlength: 2000 },
    resolution: { type: String, maxlength: 4000 },
    lessonsLearned: { type: String, maxlength: 4000 },
    actionItems: [
      {
        title: { type: String, required: true },
        owner: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: { type: Date },
        status: { type: String, enum: ['open', 'in_progress', 'done'], default: 'open' },
      },
    ],
    publishedAt: { type: Date },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 4000 },
    severity: { type: String, enum: ['SEV1', 'SEV2', 'SEV3', 'SEV4'], required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'investigating', 'identified', 'monitoring', 'mitigated', 'resolved'],
      default: 'open',
      index: true,
    },
    service: { type: Schema.Types.ObjectId, ref: 'ArchitectureComponent' },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    commander: { type: Schema.Types.ObjectId, ref: 'User' },
    detectedAt: { type: Date, required: true, default: () => new Date(), index: true },
    resolvedAt: { type: Date },
    // Mean time to resolve (minutes), computed on resolve.
    mttrMinutes: { type: Number },
    affectedUsers: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    timeline: { type: [timelineEntrySchema], default: [] },
    postmortem: { type: postmortemSchema },
    // Provenance: 'manual' (created in Nova UI) or synced from PagerDuty/Opsgenie.
    source: { type: sourceSchema, default: () => ({ system: 'manual' }) },
  },
  { timestamps: true },
);

incidentSchema.index({ title: 'text', description: 'text' });
incidentSchema.index({ severity: 1, status: 1, detectedAt: -1 });
incidentSchema.set('toJSON', { virtuals: true });

export type IncidentDoc = InferSchemaType<typeof incidentSchema>;
export const IncidentModel = model<IncidentDoc>('Incident', incidentSchema);
