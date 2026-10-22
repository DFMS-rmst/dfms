import { prisma } from '../backend/src/infrastructure/prisma/client.js';

async function main() {
  const fks = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME IN ('PrescriptionItem', 'TreatmentAdministration', 'EligibilityTreatmentEvaluation')
  `);
  console.log(JSON.stringify(fks, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
