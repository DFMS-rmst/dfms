import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  console.log('Creating dairy platform tables in MySQL...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`dairy_farmer_enrollments\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`dairyUserId\` VARCHAR(191) NOT NULL,
        \`farmerUserId\` VARCHAR(191) NULL,
        \`farmerIdNumber\` VARCHAR(100) NOT NULL,
        \`farmerName\` VARCHAR(160) NOT NULL,
        \`farmName\` VARCHAR(191) NOT NULL,
        \`phone\` VARCHAR(32) NULL,
        \`email\` VARCHAR(191) NULL,
        \`state\` VARCHAR(100) NOT NULL,
        \`district\` VARCHAR(100) NOT NULL,
        \`taluka\` VARCHAR(100) NULL,
        \`villageArea\` VARCHAR(120) NOT NULL,
        \`pincode\` VARCHAR(12) NULL,
        \`milkType\` ENUM('COW', 'BUFFALO', 'MIXED') NOT NULL DEFAULT 'COW',
        \`expectedDailyQuantity\` DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
        \`agreedRatePerLiter\` DECIMAL(10, 2) NOT NULL DEFAULT 42.00,
        \`baseFatPercentage\` DECIMAL(5, 2) NULL DEFAULT 4.00,
        \`baseSnfPercentage\` DECIMAL(5, 2) NULL DEFAULT 8.50,
        \`paymentMethod\` VARCHAR(64) NOT NULL DEFAULT 'BANK_TRANSFER',
        \`bankAccountNumber\` VARCHAR(64) NULL,
        \`bankIfsc\` VARCHAR(32) NULL,
        \`bankName\` VARCHAR(100) NULL,
        \`upiId\` VARCHAR(100) NULL,
        \`status\` ENUM('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
        \`joinRequestNotes\` TEXT NULL,
        \`enrolledAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

        INDEX \`idx_dairy_farmer_enrollments_dairy\` (\`dairyUserId\`),
        INDEX \`idx_dairy_farmer_enrollments_farmerIdNumber\` (\`farmerIdNumber\`),
        INDEX \`idx_dairy_farmer_enrollments_area\` (\`state\`, \`district\`, \`villageArea\`),
        PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`dairy_milk_intakes\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`dairyUserId\` VARCHAR(191) NOT NULL,
        \`enrollmentId\` VARCHAR(191) NULL,
        \`farmerIdNumber\` VARCHAR(100) NOT NULL,
        \`farmerName\` VARCHAR(160) NOT NULL,
        \`farmName\` VARCHAR(191) NULL,
        \`villageArea\` VARCHAR(120) NULL,
        \`collectionDate\` DATE NOT NULL,
        \`shift\` ENUM('MORNING', 'EVENING') NOT NULL DEFAULT 'MORNING',
        \`milkType\` ENUM('COW', 'BUFFALO', 'MIXED') NOT NULL DEFAULT 'COW',
        \`quantityLiters\` DECIMAL(10, 2) NOT NULL,
        \`fatPercentage\` DECIMAL(5, 2) NOT NULL DEFAULT 4.00,
        \`snfPercentage\` DECIMAL(5, 2) NOT NULL DEFAULT 8.50,
        \`ratePerLiter\` DECIMAL(10, 2) NOT NULL,
        \`totalCost\` DECIMAL(12, 2) NOT NULL,
        \`storageTank\` VARCHAR(64) NOT NULL DEFAULT 'Silo-1',
        \`eligibilityStatus\` VARCHAR(64) NOT NULL DEFAULT 'CLEARED',
        \`paymentStatus\` ENUM('PAID', 'PENDING') NOT NULL DEFAULT 'PENDING',
        \`qualityGrade\` VARCHAR(32) NOT NULL DEFAULT 'GRADE_A',
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

        INDEX \`idx_dairy_milk_intakes_dairy_date\` (\`dairyUserId\`, \`collectionDate\`),
        INDEX \`idx_dairy_milk_intakes_farmer\` (\`farmerIdNumber\`),
        PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`dairy_milk_sales\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`dairyUserId\` VARCHAR(191) NOT NULL,
        \`saleDate\` DATE NOT NULL,
        \`invoiceNumber\` VARCHAR(64) NOT NULL,
        \`buyerName\` VARCHAR(160) NOT NULL,
        \`buyerType\` ENUM('RETAIL_CONSUMER', 'COMMERCIAL_SHOP', 'WHOLESALE_DISTRIBUTOR', 'PROCESSING_PLANT') NOT NULL DEFAULT 'RETAIL_CONSUMER',
        \`milkType\` ENUM('COW', 'BUFFALO', 'TONED', 'STANDARDIZED', 'MIXED') NOT NULL DEFAULT 'COW',
        \`quantityLiters\` DECIMAL(10, 2) NOT NULL,
        \`pricePerLiter\` DECIMAL(10, 2) NOT NULL,
        \`totalAmount\` DECIMAL(12, 2) NOT NULL,
        \`dispensedFromTank\` VARCHAR(64) NOT NULL DEFAULT 'Silo-1',
        \`paymentStatus\` ENUM('PAID', 'PENDING', 'PARTIAL') NOT NULL DEFAULT 'PAID',
        \`paymentMethod\` VARCHAR(64) NOT NULL DEFAULT 'CASH',
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

        UNIQUE INDEX \`idx_dairy_milk_sales_invoice\` (\`invoiceNumber\`),
        INDEX \`idx_dairy_milk_sales_dairy_date\` (\`dairyUserId\`, \`saleDate\`),
        PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  console.log('Tables successfully created or verified in MySQL!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
