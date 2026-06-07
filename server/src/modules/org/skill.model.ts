import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A single skill assessment for a person. Levels are 1 (novice) to 5 (expert);
 * interest is 1-5 and feeds growth/career planning. The skills matrix and
 * bus-factor analysis aggregate across these documents.
 */
const skillSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skill: { type: String, required: true, trim: true, maxlength: 80 },
    category: {
      type: String,
      enum: ['language', 'framework', 'platform', 'domain', 'soft', 'tooling'],
      default: 'language',
    },
    level: { type: Number, min: 1, max: 5, default: 3 },
    interest: { type: Number, min: 1, max: 5, default: 3 },
  },
  { timestamps: true },
);

skillSchema.index({ user: 1, skill: 1 }, { unique: true });
skillSchema.set('toJSON', { virtuals: true });

export type SkillDoc = InferSchemaType<typeof skillSchema>;
export const SkillModel = model<SkillDoc>('Skill', skillSchema);
