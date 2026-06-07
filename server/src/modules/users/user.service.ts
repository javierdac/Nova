import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { parseListQuery } from '../../shared/utils/query.js';
import { userRepository } from './user.repository.js';
import type { CreateUserDto, SetCompensationDto, UpdateUserDto } from './user.dto.js';

class UserService {
  async list(rawQuery: Record<string, unknown>) {
    const query = parseListQuery(rawQuery, {
      defaultSort: 'name',
      allowedFilters: ['role', 'team', 'isActive', 'seniority'],
    });
    if (query.filters.isActive !== undefined) {
      query.filters.isActive = query.filters.isActive === 'true';
    }
    return userRepository.paginate(query);
  }

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async create(dto: CreateUserDto) {
    if (await userRepository.exists({ email: dto.email.toLowerCase() })) {
      throw new ConflictError('Email already registered');
    }
    return userRepository.create(dto);
  }

  async update(id: string, dto: UpdateUserDto) {
    const updated = await userRepository.updateById(id, dto);
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async deactivate(id: string) {
    const updated = await userRepository.updateById(id, { isActive: false, refreshTokens: [] });
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async remove(id: string) {
    const deleted = await userRepository.deleteById(id);
    if (!deleted) throw new NotFoundError('User');
  }

  /** Reads a person's compensation. Caller must hold finance-read RBAC. */
  async getCompensation(id: string) {
    const user = await userRepository.findByIdWithCompensation(id);
    if (!user) throw new NotFoundError('User');
    const comp = (user as { compensation?: { annualSalary?: number; currency?: string } }).compensation;
    return {
      userId: id,
      annualSalary: comp?.annualSalary ?? null,
      currency: comp?.currency ?? 'USD',
    };
  }

  /** Sets a person's compensation. Caller must hold finance-write RBAC. */
  async setCompensation(id: string, dto: SetCompensationDto) {
    const updated = await userRepository.setCompensation(id, dto);
    if (!updated) throw new NotFoundError('User');
    const comp = (updated as { compensation?: { annualSalary?: number; currency?: string } }).compensation;
    return {
      userId: id,
      annualSalary: comp?.annualSalary ?? null,
      currency: comp?.currency ?? 'USD',
    };
  }
}

export const userService = new UserService();
