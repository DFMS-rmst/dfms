import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  await prisma.$executeRawUnsafe('DELETE FROM `dairy_milk_intakes` WHERE `id` LIKE "%_g"');
  await prisma.$executeRawUnsafe('DELETE FROM `dairy_milk_sales` WHERE `id` LIKE "%_g"');
  await prisma.$executeRawUnsafe('DELETE FROM `dairy_milk_intakes` WHERE `notes` = "Automated test intake verification"');
  console.log('Duplicates and test rows cleaned.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
