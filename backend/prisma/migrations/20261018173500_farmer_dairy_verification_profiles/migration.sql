-- DropForeignKey
ALTER TABLE `TreatmentAdministration` DROP FOREIGN KEY `TreatmentAdministration_performedByUserId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `pendingRole` VARCHAR(32) NULL,
    MODIFY `status` ENUM('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `UserPlatformRole` MODIFY `role` ENUM('PLATFORM_ADMIN', 'VETERINARIAN', 'FARMER', 'DAIRY_OWNER') NOT NULL;

-- AlterTable
ALTER TABLE `VeterinarianProfile` ADD COLUMN `documentData` LONGTEXT NULL,
    ADD COLUMN `documentName` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `FarmerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmerIdNumber` VARCHAR(100) NULL,
    `farmName` VARCHAR(191) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `taluka` VARCHAR(100) NULL,
    `pincode` VARCHAR(12) NULL,
    `totalCattle` INTEGER NULL DEFAULT 0,
    `documentName` VARCHAR(255) NULL,
    `documentData` LONGTEXT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `farmId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FarmerProfile_userId_key`(`userId`),
    INDEX `FarmerProfile_status_state_district_idx`(`status`, `state`, `district`),
    INDEX `FarmerProfile_farmerIdNumber_idx`(`farmerIdNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DairyOwnerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dairyName` VARCHAR(191) NOT NULL,
    `fssaiLicenseNumber` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `operationalArea` VARCHAR(191) NULL,
    `dailyCapacityLiters` INTEGER NULL DEFAULT 0,
    `documentName` VARCHAR(255) NULL,
    `documentData` LONGTEXT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DairyOwnerProfile_userId_key`(`userId`),
    INDEX `DairyOwnerProfile_status_state_district_idx`(`status`, `state`, `district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FarmerProfile` ADD CONSTRAINT `FarmerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmerProfile` ADD CONSTRAINT `FarmerProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DairyOwnerProfile` ADD CONSTRAINT `DairyOwnerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DairyOwnerProfile` ADD CONSTRAINT `DairyOwnerProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_performedByUserId_fkey` FOREIGN KEY (`performedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `DailyFarmEligibilityEvaluation` RENAME INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_snapshot_idx` TO `DailyFarmEligibilityEvaluation_farmId_businessDate_snapshotH_idx`;

-- RenameIndex
ALTER TABLE `EligibilityTreatmentEvaluation` RENAME INDEX `EligibilityTreatmentEvaluation_evidence_scope_key` TO `EligibilityTreatmentEvaluation_eligibilityCheckId_evidenceSc_key`;
