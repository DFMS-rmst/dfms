import { prisma } from '../src/infrastructure/prisma/client.js';
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('MySQL connectivity: OK');
} finally {
  await prisma.$disconnect();
}
