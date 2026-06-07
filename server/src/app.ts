import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiRouter } from './routes.js';
import { errorHandler, notFoundHandler } from './shared/middleware/error.js';
import { globalRateLimiter } from './shared/middleware/rateLimit.js';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security & infra middleware.
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Liveness / readiness probe.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nova-api', timestamp: new Date().toISOString() });
  });

  // Versioned API surface with global rate limiting.
  app.use(env.API_PREFIX, globalRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
