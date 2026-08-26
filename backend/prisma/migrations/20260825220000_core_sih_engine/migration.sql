-- Milestone 6 reference, eligibility, and alert support.
ALTER TABLE `EligibilityTreatmentEvaluation` DROP FOREIGN KEY `EligibilityTreatmentEvaluation_eligibilityCheckId_fkey`;
ALTER TABLE `WithdrawalRule` DROP FOREIGN KEY `WithdrawalRule_drugId_fkey`;
DROP INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_treatmentI_key` ON `EligibilityTreatmentEvaluation`;
ALTER TABLE `Alert` ADD COLUMN `dedupKey` VARCHAR(191) NULL;
ALTER TABLE `EligibilityTreatmentEvaluation` ADD COLUMN `drugId` VARCHAR(191) NULL;
ALTER TABLE `MilkEligibilityCheck` ADD COLUMN `eligibilityDate` DATETIME(3) NULL,
    ADD COLUMN `farmId` VARCHAR(191) NOT NULL,
    ADD COLUMN `inputHash` CHAR(64) NOT NULL,
    ADD COLUMN `isCurrent` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `WithdrawalRule` ADD COLUMN `certificateUse` VARCHAR(255) NULL,
    ADD COLUMN `ruleType` VARCHAR(80) NOT NULL,
    MODIFY `drugId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Alert_dedupKey_key` ON `Alert`(`dedupKey`);
CREATE UNIQUE INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_treatmentI_key` ON `EligibilityTreatmentEvaluation`(`eligibilityCheckId`, `treatmentId`, `drugId`);
CREATE INDEX `MilkEligibilityCheck_farmId_status_isCurrent_idx` ON `MilkEligibilityCheck`(`farmId`, `status`, `isCurrent`);
CREATE UNIQUE INDEX `MilkEligibilityCheck_animalId_inputHash_key` ON `MilkEligibilityCheck`(`animalId`, `inputHash`);
ALTER TABLE `WithdrawalRule` ADD CONSTRAINT `WithdrawalRule_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MilkEligibilityCheck` ADD CONSTRAINT `MilkEligibilityCheck_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
