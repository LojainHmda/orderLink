import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env.js';

/**
 * A single shared PrismaClient. In dev we stash it on `globalThis` so hot-reloads
 * (tsx watch) don't open a new pool on every restart.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isProd ? ['warn', 'error'] : ['warn', 'error'] });

if (!isProd) globalForPrisma.prisma = prisma;
