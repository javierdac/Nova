import { Schema, model, type InferSchemaType } from 'mongoose';
import { sourceSchema } from '../../shared/source.js';

const milestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ['planned', 'in_progress', 'done', 'blocked'], default: 'planned' },
  },
  { _id: true },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    key: { type: String, uppercase: true, trim: true, unique: true, sparse: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['discovery', 'planned', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planned',
      index: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    // Engineering-investment bucket: building new value vs. keeping the lights on.
    // Feeds the investment-allocation view. Incidents/tech-debt are their own buckets.
    investmentCategory: { type: String, enum: ['new_value', 'ktlo'], default: 'new_value', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date },
    targetDate: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    // Roadmap health is derived but cached for fast dashboard reads.
    roadmapHealth: { type: String, enum: ['on_track', 'at_risk', 'off_track'], default: 'on_track', index: true },
    riskNotes: { type: String, maxlength: 1000 },
    milestones: { type: [milestoneSchema], default: [] },
    tags: { type: [String], default: [] },
    source: { type: sourceSchema, default: () => ({ system: 'manual' }) },
  },
  { timestamps: true },
);

projectSchema.index({ name: 'text', description: 'text', key: 'text' });
projectSchema.index({ team: 1, status: 1 });
projectSchema.set('toJSON', { virtuals: true });

export type ProjectDoc = InferSchemaType<typeof projectSchema>;
export const ProjectModel = model<ProjectDoc>('Project', projectSchema);
