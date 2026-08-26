-- AlterTable
ALTER TABLE `FileObject` ADD COLUMN `caseMessageId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PrescriptionItem` ADD COLUMN `expectedEndDate` DATETIME(3) NULL,
    ADD COLUMN `startDate` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Treatment` ADD COLUMN `farmId` VARCHAR(191) NOT NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `veterinarianId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `TreatmentAdministration` ADD COLUMN `prescriptionItemId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TreatmentRequest` ADD COLUMN `symptoms` TEXT NULL;
