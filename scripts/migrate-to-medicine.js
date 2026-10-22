import { prisma } from '../backend/src/infrastructure/prisma/client.js';

async function migrate() {
  console.log('Starting migration to Medicine model...');

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  // Drop FK constraints
  const dropFk = async (table, constraint) => {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint}\``);
      console.log(`Dropped FK ${constraint} from ${table}`);
    } catch (e) {
      console.log(`Could not drop FK ${constraint} (might not exist):`, e.message);
    }
  };

  await dropFk('PrescriptionItem', 'PrescriptionItem_drugId_fkey');
  await dropFk('PrescriptionItem', 'PrescriptionItem_drugProductId_fkey');
  await dropFk('TreatmentAdministration', 'TreatmentAdministration_drugId_fkey');
  await dropFk('TreatmentAdministration', 'TreatmentAdministration_drugProductId_fkey');
  await dropFk('EligibilityTreatmentEvaluation', 'EligibilityTreatmentEvaluation_drugId_fkey');
  await dropFk(
    'EligibilityTreatmentEvaluation',
    'EligibilityTreatmentEvaluation_drugProductId_fkey',
  );
  await dropFk(
    'EligibilityTreatmentEvaluation',
    'EligibilityTreatmentEvaluation_withdrawalRuleId_fkey',
  );

  // Drop deprecated tables
  const tablesToDrop = [
    'DrugSpecies',
    'DrugProduct',
    'WithdrawalRule',
    'MrlReferenceRule',
    'RegulatorySource',
    'Drug',
    'Medicine',
  ];

  for (const table of tablesToDrop) {
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Dropped table ${table}`);
    } catch (e) {
      console.log(`Error dropping ${table}:`, e.message);
    }
  }

  // Create Medicine table
  console.log('Creating Medicine table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`Medicine\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`medicineName\` VARCHAR(255) NOT NULL,
      \`antimicrobialClass\` VARCHAR(120) NOT NULL,
      \`isAntibiotic\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`milkWithdrawalDays\` INT NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Insert seed data
  console.log('Seeding Medicine table...');
  await prisma.$executeRawUnsafe(`
    INSERT INTO \`Medicine\` (\`id\`, \`medicineName\` , \`antimicrobialClass\`, \`isAntibiotic\`, \`milkWithdrawalDays\`) VALUES
    (UUID(), 'Amoxicillin 150mg Injection', 'Penicillins', true, 3),
    (UUID(), 'Oxytetracycline 200mg LA', 'Tetracyclines', true, 7),
    (UUID(), 'Ceftiofur 50mg RTU', 'Cephalosporins', true, 0),
    (UUID(), 'Enrofloxacin 10%', 'Fluoroquinolones', true, 4),
    (UUID(), 'Sulfadimidine 33.3%', 'Sulfonamides', true, 5),
    (UUID(), 'Meloxicam 5mg/ml (Pain Relief)', 'NSAID', false, 5);
  `);

  // Get a default medicine id for existing rows
  const [defaultMed] = await prisma.$queryRawUnsafe('SELECT id FROM `Medicine` LIMIT 1');
  const defaultMedId = defaultMed.id;

  // Update PrescriptionItem
  console.log('Updating PrescriptionItem columns...');
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `PrescriptionItem` ADD COLUMN `medicineId` VARCHAR(191) NULL',
    );
  } catch (e) {
    console.log('PrescriptionItem.medicineId already exists or error:', e.message);
  }
  await prisma.$executeRawUnsafe(
    'UPDATE `PrescriptionItem` SET `medicineId` = ? WHERE `medicineId` IS NULL',
    defaultMedId,
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE `PrescriptionItem` MODIFY COLUMN `medicineId` VARCHAR(191) NOT NULL',
  );
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE `PrescriptionItem` DROP COLUMN `drugId`');
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE `PrescriptionItem` DROP COLUMN `drugProductId`');
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    );
  } catch (e) {
    console.log('Error adding PrescriptionItem_medicineId_fkey:', e.message);
  }

  // Update TreatmentAdministration
  console.log('Updating TreatmentAdministration columns...');
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TreatmentAdministration` ADD COLUMN `medicineId` VARCHAR(191) NULL',
    );
  } catch (e) {
    console.log('TreatmentAdministration.medicineId already exists or error:', e.message);
  }
  await prisma.$executeRawUnsafe(
    'UPDATE `TreatmentAdministration` SET `medicineId` = ? WHERE `medicineId` IS NULL',
    defaultMedId,
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE `TreatmentAdministration` MODIFY COLUMN `medicineId` VARCHAR(191) NOT NULL',
  );
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE `TreatmentAdministration` DROP COLUMN `drugId`');
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TreatmentAdministration` DROP COLUMN `drugProductId`',
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    );
  } catch (e) {
    console.log('Error adding TreatmentAdministration_medicineId_fkey:', e.message);
  }

  // Update EligibilityTreatmentEvaluation
  console.log('Updating EligibilityTreatmentEvaluation columns...');
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `EligibilityTreatmentEvaluation` ADD COLUMN `medicineId` VARCHAR(191) NULL',
    );
  } catch (e) {
    console.log('EligibilityTreatmentEvaluation.medicineId already exists or error:', e.message);
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `EligibilityTreatmentEvaluation` DROP COLUMN `drugId`',
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `EligibilityTreatmentEvaluation` DROP COLUMN `drugProductId`',
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `EligibilityTreatmentEvaluation` DROP COLUMN `withdrawalRuleId`',
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    );
  } catch (e) {
    console.log('Error adding EligibilityTreatmentEvaluation_medicineId_fkey:', e.message);
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  const meds = await prisma.$queryRawUnsafe('SELECT * FROM `Medicine`');
  console.log('Migration successful! Seeded medicines:', meds);

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
