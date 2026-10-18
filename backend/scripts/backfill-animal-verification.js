import crypto from 'node:crypto';
import { prisma } from '../src/infrastructure/prisma/client.js';

export async function backfillAnimalVerification(client = prisma) {
  const animals = await client.animal.findMany({ where: { verificationId: null } });
  let count = 0;
  for (const animal of animals) {
    let verificationId;
    if (animal.tagNumber === 'DEMO-COW-ELIGIBLE') {
      verificationId = 'demo-animal-verification-eligible';
    } else if (animal.tagNumber === 'DEMO-COW-RULE-MISSING') {
      verificationId = 'demo-animal-verification-rule-missing';
    } else {
      verificationId = `anm_${crypto.randomBytes(16).toString('base64url')}`;
    }
    // Check if verificationId already exists to avoid collisions
    const existing = await client.animal.findUnique({ where: { verificationId } });
    if (existing) {
      verificationId = `anm_${crypto.randomBytes(16).toString('base64url')}`;
    }
    await client.animal.update({
      where: { id: animal.id },
      data: { verificationId },
    });
    count++;
  }
  return count;
}

if (process.argv[1] && process.argv[1].endsWith('backfill-animal-verification.js')) {
  try {
    const updated = await backfillAnimalVerification();
    console.log(`Backfilled verificationId for ${updated} animals successfully.`);
  } finally {
    await prisma.$disconnect();
  }
}
