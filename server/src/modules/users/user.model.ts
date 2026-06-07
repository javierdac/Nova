import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { ROLES } from '../../shared/types/index.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ROLES, default: 'engineer', index: true },
    title: { type: String, trim: true },
    avatarUrl: { type: String },
    team: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    manager: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    seniority: {
      type: String,
      enum: ['intern', 'junior', 'mid', 'senior', 'staff', 'principal'],
      default: 'mid',
    },
    timezone: { type: String, default: 'UTC' },
    weeklyCapacityHours: { type: Number, default: 40, min: 0, max: 80 },
    // Per-person compensation. Sensitive: `select: false` keeps it out of the
    // general user list/get (engineers & viewers can read those). Only the
    // dedicated compensation endpoints (finance-level RBAC) load these fields.
    compensation: {
      annualSalary: { type: Number, min: 0, select: false },
      currency: { type: String, default: 'USD', uppercase: true, select: false },
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [String], select: false, default: [] },
  },
  { timestamps: true },
);

userSchema.index({ name: 'text', email: 'text', title: 'text' });

// Hash password on create/change.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.__v;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
};
export type UserHydrated = HydratedDocument<UserDoc> & {
  comparePassword(candidate: string): Promise<boolean>;
};

export const UserModel = model<UserDoc>('User', userSchema);
