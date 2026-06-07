import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { logger } from '../../config/logger.js';
import { isProd } from '../../config/env.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

/** Centralized error-handling middleware. Normalizes all errors to a uniform shape. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Schema validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}`;
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const key = Object.keys((err as { keyValue?: object }).keyValue ?? {})[0];
    message = `A record with this ${key ?? 'value'} already exists`;
  }

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ code, path: req.originalUrl }, message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(!isProd && statusCode >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
