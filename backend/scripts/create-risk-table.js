import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`AnimalRiskAssessment\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`animalId\` VARCHAR(191) NOT NULL,
      \`caseId\` VARCHAR(191) NULL,
      \`veterinarianId\` VARCHAR(191) NULL,
      \`createdById\` VARCHAR(191) NOT NULL,
      \`species\` VARCHAR(60) NOT NULL,
      \`ageYears\` DECIMAL(6, 2) NOT NULL,
      \`weightKg\` DECIMAL(8, 2) NOT NULL,
      \`treatmentsLast30d\` INT NOT NULL,
      \`treatmentsLast90d\` INT NOT NULL,
      \`daysSinceLastTreatment\` INT NOT NULL,
      \`uniqueAntimicrobialClasses90d\` INT NOT NULL,
      \`maxRepeatedClassCount90d\` INT NOT NULL,
      \`meanTreatmentIntervalDays\` DECIMAL(8, 2) NOT NULL,
      \`totalAntimicrobialDays90d\` INT NOT NULL,
      \`recurrentConditionEvents90d\` INT NOT NULL,
      \`noResponseEvents90d\` INT NOT NULL,
      \`partialResponseEvents90d\` INT NOT NULL,
      \`predictedRisk\` VARCHAR(40) NOT NULL,
      \`probabilities\` JSON NOT NULL,
      \`notes\` TEXT NULL,
      \`recommendations\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`AnimalRiskAssessment_animalId_idx\` (\`animalId\`),
      INDEX \`AnimalRiskAssessment_predictedRisk_idx\` (\`predictedRisk\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  console.log('AnimalRiskAssessment table ensured successfully');
}

main().catch(console.error).finally(() => process.exit(0));
