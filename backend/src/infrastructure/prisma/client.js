import '../../config/env.js';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

const globalForPrisma = globalThis;
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: env.DATABASE_URL ? { db: { url: env.DATABASE_URL } } : undefined,
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

