import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'dairy@gmail.com' } });
  if (!user) return;

  const count = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as c FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ?',
    user.id
  );
  if (Number(count[0]?.c || 0) === 0) {
    console.log('Copying seed data for dairy@gmail.com user', user.id);
    await prisma.$executeRawUnsafe(
      'INSERT IGNORE INTO `dairy_farmer_enrollments` SELECT CONCAT(id, "_g"), ?, farmerUserId, farmerIdNumber, farmerName, farmName, phone, email, state, district, taluka, villageArea, pincode, milkType, expectedDailyQuantity, agreedRatePerLiter, baseFatPercentage, baseSnfPercentage, paymentMethod, bankAccountNumber, bankIfsc, bankName, upiId, status, joinRequestNotes, enrolledAt, createdAt, updatedAt FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = "usr_demo_dairy"',
      user.id
    );
    await prisma.$executeRawUnsafe(
      'INSERT IGNORE INTO `dairy_milk_intakes` SELECT CONCAT(id, "_g"), ?, enrollmentId, farmerIdNumber, farmerName, farmName, villageArea, collectionDate, shift, milkType, quantityLiters, fatPercentage, snfPercentage, ratePerLiter, totalCost, storageTank, eligibilityStatus, paymentStatus, qualityGrade, notes, createdAt FROM `dairy_milk_intakes` WHERE `dairyUserId` = "usr_demo_dairy"',
      user.id
    );
    await prisma.$executeRawUnsafe(
      'INSERT IGNORE INTO `dairy_milk_sales` SELECT CONCAT(id, "_g"), ?, saleDate, CONCAT(invoiceNumber, "-G"), buyerName, buyerType, milkType, quantityLiters, pricePerLiter, totalAmount, dispensedFromTank, paymentStatus, paymentMethod, notes, createdAt FROM `dairy_milk_sales` WHERE `dairyUserId` = "usr_demo_dairy"',
      user.id
    );
    console.log('Data copied successfully for dairy@gmail.com!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
