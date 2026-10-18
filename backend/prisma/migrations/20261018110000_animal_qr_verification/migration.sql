-- AlterTable
ALTER TABLE `Animal` ADD COLUMN `verificationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Animal_verificationId_key` ON `Animal`(`verificationId`);
