import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initRealtime } from './lib/realtime.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const httpServer = createServer(app);
initRealtime(httpServer);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`OrderLink API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
