import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { ROLE_RANK, type Role } from '../types/index.js';
import { verifyAccessToken } from '../../modules/auth/token.service.js';

/** Requires a valid access token; attaches the decoded user to req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

/** Allows the request only if the user holds one of the explicit roles. */
export function authorize(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowed.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires one of roles: ${allowed.join(', ')}`));
    }
    next();
  };
}

/** Allows the request if the user's role rank meets or exceeds `minRole`. */
export function authorizeAtLeast(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      return next(new ForbiddenError(`Requires role rank >= ${minRole}`));
    }
    next();
  };
}
