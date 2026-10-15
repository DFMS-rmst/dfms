ALTER TABLE `TreatmentAdministration`
  ADD COLUMN `performedByUserId` VARCHAR(191) NULL,
  ADD COLUMN `performedByName` VARCHAR(160) NULL,
  ADD COLUMN `deviationReason` TEXT NULL;

CREATE INDEX `TreatmentAdministration_performedByUserId_idx`
  ON `TreatmentAdministration`(`performedByUserId`);

ALTER TABLE `TreatmentAdministration`
  ADD CONSTRAINT `TreatmentAdministration_performedByUserId_fkey`
  FOREIGN KEY (`performedByUserId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
