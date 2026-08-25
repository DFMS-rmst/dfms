import crypto from 'node:crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/routes.js';
import { authRouter } from './modules/auth/index.js';
import { farmsRouter } from './modules/farms/index.js';
import { animalsRouter, speciesRouter } from './modules/animals/index.js';
import { filesRouter } from './modules/files/index.js';
import { adminVeterinariansRouter, veterinariansRouter } from './modules/veterinarians/index.js';

export function createApp() {
  const app = express();
  app.set('json replacer', (_key, value) => (typeof value === 'bigint' ? Number(value) : value));
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      genReqId: (request) => request.headers['x-request-id'] || crypto.randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/farms', farmsRouter);
  app.use('/api/v1/farms/:farmId/animals', animalsRouter);
  app.use('/api/v1/species', speciesRouter);
  app.use('/api/v1/veterinarians', veterinariansRouter);
  app.use('/api/v1/admin/veterinarians', adminVeterinariansRouter);
  app.use('/api/v1/files', filesRouter);
  app.use((request, response) =>
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found', requestId: request.id } }),
  );
  app.use((error, request, response, _next) => {
    if (error.code === 'P2002')
      error = Object.assign(error, {
        status: 409,
        code: 'CONFLICT',
        message: 'A unique value is already in use',
      });
    const status = error.status || 500;
    if (status >= 500) request.log.error({ err: error }, 'Unhandled request error');
    response.status(status).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: status >= 500 ? 'Unexpected server error' : error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId: request.id,
      },
    });
  });
  return app;
}
