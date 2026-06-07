import { Schema, model, type InferSchemaType } from 'mongoose';

const ptoSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['vacation', 'sick', 'parental', 'other'], default: 'vacation' },
    note: { type: String, maxlength: 280 },
  },
  { _id: true, timestamps: true },
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    slug: { type: String, lowercase: true, trim: true, index: true },
    description: { type: String, maxlength: 1000 },
    lead: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mission: { type: String, maxlength: 500 },
    // Manually-tracked health signals (0-100). Combined into healthScore by the service.
    signals: {
      morale: { type: Number, min: 0, max: 100, default: 70 },
      velocityConfidence: { type: Number, min: 0, max: 100, default: 70 },
      onCallLoad: { type: Number, min: 0, max: 100, default: 30 }, // higher = worse
      attrition: { type: Number, min: 0, max: 100, default: 10 }, // higher = worse
    },
    weeklyCapacityHours: { type: Number, default: 0 },
    pto: { type: [ptoSchema], default: [] },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

teamSchema.index({ name: 'text', description: 'text', mission: 'text' });

teamSchema.pre('save', function setSlug(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

teamSchema.set('toJSON', { virtuals: true });

export type TeamDoc = InferSchemaType<typeof teamSchema>;
export const TeamModel = model<TeamDoc>('Team', teamSchema);
