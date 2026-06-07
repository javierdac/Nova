import { Schema, model, type InferSchemaType } from 'mongoose';

const techDebtSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 4000 },
    category: {
      type: String,
      enum: ['architecture', 'code_quality', 'testing', 'infrastructure', 'security', 'documentation', 'dependencies'],
      default: 'code_quality',
      index: true,
    },
    status: { type: String, enum: ['identified', 'accepted', 'in_progress', 'resolved', 'wont_fix'], default: 'identified', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    component: { type: Schema.Types.ObjectId, ref: 'ArchitectureComponent' },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    // 1-10 scoring inputs.
    impactScore: { type: Number, min: 1, max: 10, required: true },
    riskScore: { type: Number, min: 1, max: 10, required: true },
    effortScore: { type: Number, min: 1, max: 10, required: true },
    // Derived: (impact + risk) / effort. Cached for sorting.
    priorityScore: { type: Number, index: true },
    quadrant: { type: String, enum: ['quick_win', 'major_project', 'fill_in', 'thankless'], index: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

techDebtSchema.index({ title: 'text', description: 'text' });

/** Compute the derived priority score and effort/value quadrant before save. */
function deriveScores(doc: { impactScore: number; riskScore: number; effortScore: number }) {
  const value = doc.impactScore + doc.riskScore; // 2-20
  const priorityScore = Number((value / doc.effortScore).toFixed(2));
  const highValue = value >= 12;
  const lowEffort = doc.effortScore <= 5;
  const quadrant = highValue
    ? lowEffort
      ? 'quick_win'
      : 'major_project'
    : lowEffort
      ? 'fill_in'
      : 'thankless';
  return { priorityScore, quadrant };
}

techDebtSchema.pre('save', function (next) {
  Object.assign(this, deriveScores(this as never));
  next();
});

techDebtSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Record<string, number> | null;
  if (update && (update.impactScore || update.riskScore || update.effortScore)) {
    // Need full doc to recompute; fetch current then merge.
    this.model
      .findOne(this.getQuery())
      .then((existing) => {
        if (existing) {
          const merged = {
            impactScore: update.impactScore ?? existing.impactScore,
            riskScore: update.riskScore ?? existing.riskScore,
            effortScore: update.effortScore ?? existing.effortScore,
          };
          Object.assign(update, deriveScores(merged));
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

techDebtSchema.set('toJSON', { virtuals: true });

export type TechDebtDoc = InferSchemaType<typeof techDebtSchema>;
export const TechDebtModel = model<TechDebtDoc>('TechDebt', techDebtSchema);
