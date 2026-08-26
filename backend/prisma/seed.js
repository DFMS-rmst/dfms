import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { importReferenceData } from './import-reference.js';

const prisma = new PrismaClient();
await importReferenceData(prisma);

if (process.env.SEED_DEMO_DATA === 'true') {
  const passwordHash = await argon2.hash('DemoOnly!234', { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    create: {
      email: 'admin@example.local',
      fullName: 'Demo Platform Admin',
      passwordHash,
      platformRoles: { create: { role: 'PLATFORM_ADMIN' } },
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: 'farmer@example.local' },
    create: { email: 'farmer@example.local', fullName: 'Demo Farm Owner', passwordHash },
    update: {},
  });
}
await prisma.$disconnect();
