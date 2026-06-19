import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(): Express {
  const app = express();

  // CSP/COEP off so the bundled client can load Google Fonts, Material Symbols
  // and the QR image; the rest of Helmet's hardening stays on.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.use('/api', apiRouter);

  // In production the built client is served from the same origin as the API
  // (set via CLIENT_DIST in the container), so there's no CORS and Socket.IO
  // "just works". Unset in dev, where Vite serves the client.
  const clientDist = process.env.CLIENT_DIST;
  if (clientDist && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: send index.html for client routes (but never for API/sockets).
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
