import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  const intakeStats = await prisma.$queryRawUnsafe('SELECT collectionDate, COUNT(*) as count, SUM(quantityLiters) as totalLiters, SUM(totalCost) as totalPayout FROM dairy_milk_intakes GROUP BY collectionDate ORDER BY collectionDate ASC');
  console.log('Intakes by Date:', intakeStats);

  const salesStats = await prisma.$queryRawUnsafe('SELECT saleDate, COUNT(*) as count, SUM(quantityLiters) as totalLiters, SUM(totalAmount) as totalRev FROM dairy_milk_sales GROUP BY saleDate ORDER BY saleDate ASC');
  console.log('Sales by Date:', salesStats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
