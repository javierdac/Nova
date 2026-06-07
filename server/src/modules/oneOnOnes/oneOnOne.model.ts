import { Schema, model, type InferSchemaType } from 'mongoose';

const goalSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ['performance', 'career', 'skill', 'project'], default: 'performance' },
    status: { type: String, enum: ['not_started', 'in_progress', 'achieved', 'dropped'], default: 'not_started' },
    dueDate: { type: Date },
  },
  { _id: true },
);

const oneOnOneSchema = new Schema(
  {
    manager: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    report: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, default: () => new Date(), index: true },
    // Private notes are visible only to the manager; shared notes to both.
    notes: { type: String, maxlength: 8000 },
    privateNotes: { type: String, maxlength: 8000, select: false },
    mood: { type: String, enum: ['great', 'good', 'neutral', 'concerned', 'at_risk'] },
    feedback: {
      strengths: { type: String, maxlength: 2000 },
      improvements: { type: String, maxlength: 2000 },
    },
    careerGrowth: {
      currentLevel: { type: String },
      targetLevel: { type: String },
      plan: { type: String, maxlength: 4000 },
    },
    goals: { type: [goalSchema], default: [] },
    actionItems: [
      {
        title: { type: String, required: true },
        owner: { type: String, enum: ['manager', 'report'], default: 'report' },
        done: { type: Boolean, default: false },
      },
    ],
    nextMeetingDate: { type: Date },
  },
  { timestamps: true },
);

oneOnOneSchema.index({ manager: 1, report: 1, date: -1 });

export type OneOnOneDoc = InferSchemaType<typeof oneOnOneSchema>;
export const OneOnOneModel = model<OneOnOneDoc>('OneOnOne', oneOnOneSchema);
