import { BaseRepository } from '../../shared/repository/BaseRepository.js';
import { UserModel, type UserDoc, type UserHydrated } from './user.model.js';

class UserRepository extends BaseRepository<UserDoc> {
  protected readonly searchableFields = ['name', 'email', 'title'];

  /** Fetches a hydrated doc including the password hash for auth flows. */
  findByEmailWithSecrets(email: string): Promise<UserHydrated | null> {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select('+password +refreshTokens')
      .exec() as Promise<UserHydrated | null>;
  }

  findHydratedById(id: string): Promise<UserHydrated | null> {
    return UserModel.findById(id).select('+password +refreshTokens').exec() as Promise<UserHydrated | null>;
  }

  /** Loads a user including the `select: false` compensation fields. */
  findByIdWithCompensation(id: string): Promise<UserDoc | null> {
    return UserModel.findById(id)
      .select('+compensation.annualSalary +compensation.currency')
      .lean<UserDoc>()
      .exec();
  }

  /** Sets compensation and returns the doc with the hidden fields included. */
  setCompensation(id: string, dto: { annualSalary: number; currency?: string }): Promise<UserDoc | null> {
    const $set: Record<string, unknown> = { 'compensation.annualSalary': dto.annualSalary };
    if (dto.currency) $set['compensation.currency'] = dto.currency;
    return UserModel.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true })
      .select('+compensation.annualSalary +compensation.currency')
      .lean<UserDoc>()
      .exec();
  }
}

export const userRepository = new UserRepository(UserModel);
