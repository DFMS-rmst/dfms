import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      genReqId: (request) => request.headers['x-request-id'] || crypto.randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );
  app.use('/api/v1/health', healthRouter);
  app.use((request, response) =>
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found', requestId: request.id } }),
  );
  app.use((error, request, response, _next) => {
    request.log.error({ err: error }, 'Unhandled request error');
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
        requestId: request.id,
      },
    });
  });
  return app;
}
