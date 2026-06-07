import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A skill in the org-wide catalog (e.g. "TypeScript", "Go"). Defined once,
 * independently of any person, then referenced by per-person skill assessments
 * ({@link SkillModel}). Keeping the catalog separate avoids duplicate/typo'd
 * skill names (e.g. "Node" vs "Node.js") across assessments.
 */
const skillCatalogSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    category: {
      type: String,
      enum: ['language', 'framework', 'platform', 'domain', 'soft', 'tooling'],
      default: 'language',
    },
    description: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true },
);

skillCatalogSchema.set('toJSON', { virtuals: true });

export type SkillCatalogDoc = InferSchemaType<typeof skillCatalogSchema>;
export const SkillCatalogModel = model<SkillCatalogDoc>('SkillCatalog', skillCatalogSchema);
