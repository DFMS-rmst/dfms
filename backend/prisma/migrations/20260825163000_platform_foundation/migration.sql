-- DropForeignKey
ALTER TABLE `Animal` DROP FOREIGN KEY `Animal_farmId_fkey`;

-- DropIndex
DROP INDEX `Animal_farmId_active_idx` ON `Animal`;

-- AlterTable
ALTER TABLE `Animal` DROP COLUMN `active`,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'SOLD', 'DECEASED', 'TRANSFERRED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `FarmMember` ADD COLUMN `invitedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `FileObject` ADD COLUMN `veterinarianProfileId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RefreshToken` ADD COLUMN `lastUsedAt` DATETIME(3) NULL,
    ADD COLUMN `revocationReason` VARCHAR(80) NULL;

-- AlterTable
ALTER TABLE `UserPlatformRole` MODIFY `role` ENUM('PLATFORM_ADMIN', 'VETERINARIAN') NOT NULL;

-- CreateTable
CREATE TABLE `AnimalProfileEvent` (
    `id` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(80) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnimalProfileEvent_animalId_createdAt_idx`(`animalId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Animal_farmId_status_idx` ON `Animal`(`farmId`, `status`);
