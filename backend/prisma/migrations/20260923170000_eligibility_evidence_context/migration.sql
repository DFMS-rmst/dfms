CREATE INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_idx`
  ON `EligibilityTreatmentEvaluation`(`eligibilityCheckId`);

DROP INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_treatmentI_key`
  ON `EligibilityTreatmentEvaluation`;

ALTER TABLE `EligibilityTreatmentEvaluation`
  ADD COLUMN `drugProductId` VARCHAR(191) NULL,
  ADD COLUMN `route` VARCHAR(100) NULL,
  ADD COLUMN `lastAdministrationAt` DATETIME(3) NULL,
  ADD COLUMN `evidenceScopeHash` CHAR(64) NULL;

UPDATE `EligibilityTreatmentEvaluation`
SET `evidenceScopeHash` = SHA2(
  CONCAT_WS('|', `treatmentId`, COALESCE(`drugId`, ''), '', ''),
  256
);

ALTER TABLE `EligibilityTreatmentEvaluation`
  MODIFY COLUMN `evidenceScopeHash` CHAR(64) NOT NULL;

CREATE UNIQUE INDEX `EligibilityTreatmentEvaluation_evidence_scope_key`
  ON `EligibilityTreatmentEvaluation`(`eligibilityCheckId`, `evidenceScopeHash`);

CREATE INDEX `EligibilityTreatmentEvaluation_drugProductId_idx`
  ON `EligibilityTreatmentEvaluation`(`drugProductId`);

ALTER TABLE `EligibilityTreatmentEvaluation`
  ADD CONSTRAINT `EligibilityTreatmentEvaluation_drugProductId_fkey`
  FOREIGN KEY (`drugProductId`) REFERENCES `DrugProduct`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
