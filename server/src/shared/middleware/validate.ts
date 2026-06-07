import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/AppError.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validation middleware factory. Parses and replaces req.body / req.query /
 * req.params with the validated, typed output. Throws a 422 ValidationError
 * with field-level details on failure.
 */
export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        // req.query is read-only in Express 5; stash validated copy instead.
        req.validated = { ...req.validated, query: schemas.query.parse(req.query) };
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Request validation failed', err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };

/** Convenience accessor for the validated query produced above. */
export function validatedQuery<T>(req: Request): T {
  return (req.validated?.query as T) ?? (req.query as unknown as T);
}
