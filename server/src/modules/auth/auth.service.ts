import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { userRepository } from '../users/user.repository.js';
import type { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './token.service.js';
import type { Role } from '../../shared/types/index.js';

interface AuthResult {
  user: { id: string; name: string; email: string; role: Role; title?: string };
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private issueTokens(user: { id: string; email: string; role: Role; name: string }) {
    const tokenId = randomUUID();
    return {
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role, name: user.name }),
      refreshToken: signRefreshToken({ sub: user.id, tokenId }),
      tokenId,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const exists = await userRepository.exists({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictError('Email already registered');

    const user = await userRepository.findByEmailWithSecrets(dto.email).then(async (existing) => {
      if (existing) return existing;
      const created = await userRepository.create({
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: (dto.role as Role) ?? 'engineer',
        title: dto.title,
      });
      return userRepository.findHydratedById(String((created as unknown as { _id: unknown })._id));
    });

    if (!user) throw new ConflictError('Could not create user');

    const { accessToken, refreshToken, tokenId } = this.issueTokens({
      id: String(user._id),
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });
    user.refreshTokens = [tokenId];
    await user.save();

    return {
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role as Role, title: user.title ?? undefined },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithSecrets(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const valid = await user.comparePassword(dto.password);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const { accessToken, refreshToken, tokenId } = this.issueTokens({
      id: String(user._id),
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });

    // Keep a rolling window of valid refresh token ids (max 5 sessions).
    user.refreshTokens = [...(user.refreshTokens ?? []), tokenId].slice(-5);
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role as Role, title: user.title ?? undefined },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await userRepository.findHydratedById(payload.sub);
    if (!user || !user.refreshTokens?.includes(payload.tokenId)) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    // Rotate: drop the used token id, add a fresh one.
    const next = this.issueTokens({
      id: String(user._id),
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });
    user.refreshTokens = [...user.refreshTokens.filter((t) => t !== payload.tokenId), next.tokenId].slice(-5);
    await user.save();

    return { accessToken: next.accessToken, refreshToken: next.refreshToken };
  }

  async logout(userId: string): Promise<void> {
    const user = await userRepository.findHydratedById(userId);
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }
  }

  /** Self-service profile update for the authenticated user. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await userRepository.updateById(userId, dto);
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await userRepository.findHydratedById(userId);
    if (!user) throw new UnauthorizedError();
    const valid = await user.comparePassword(dto.currentPassword);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');
    user.password = dto.newPassword;
    user.refreshTokens = []; // force re-login on all devices
    await user.save();
  }
}

export const authService = new AuthService();
