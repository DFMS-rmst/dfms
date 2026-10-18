CREATE TABLE `DailyFarmEligibilityEvaluation` (
  `id` VARCHAR(191) NOT NULL,
  `farmId` VARCHAR(191) NOT NULL,
  `businessDate` DATE NOT NULL,
  `timeZone` VARCHAR(64) NOT NULL,
  `version` INTEGER NOT NULL,
  `status` ENUM('CURRENT', 'SUPERSEDED', 'INVALIDATED') NOT NULL DEFAULT 'CURRENT',
  `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applicableCount` INTEGER NOT NULL,
  `eligibleCount` INTEGER NOT NULL,
  `blockedCount` INTEGER NOT NULL,
  `snapshotHashSha256` CHAR(64) NOT NULL,
  `canonicalPayload` JSON NOT NULL,
  `supersededById` VARCHAR(191) NULL,
  `invalidatedAt` DATETIME(3) NULL,
  `invalidationReason` VARCHAR(255) NULL,
  `currentSlot` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `DailyFarmEligibilityEvaluation_supersededById_key` (`supersededById`),
  UNIQUE INDEX `DailyFarmEligibilityEvaluation_currentSlot_key` (`currentSlot`),
  UNIQUE INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_version_key` (`farmId`, `businessDate`, `version`),
  INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_snapshot_idx` (`farmId`, `businessDate`, `snapshotHashSha256`),
  INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_status_idx` (`farmId`, `businessDate`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DailyFarmEligibilityItem` (
  `id` VARCHAR(191) NOT NULL,
  `evaluationId` VARCHAR(191) NOT NULL,
  `animalId` VARCHAR(191) NOT NULL,
  `eligibilityCheckId` VARCHAR(191) NOT NULL,
  `included` BOOLEAN NOT NULL,
  `eligibilityStatus` ENUM('TREATMENT_ACTIVE', 'UNDER_WITHDRAWAL', 'ELIGIBLE_FOR_MILK', 'RULE_NOT_FOUND', 'REVIEW_REQUIRED') NOT NULL,
  `animalTagSnapshot` VARCHAR(100) NOT NULL,
  `animalNameSnapshot` VARCHAR(120) NULL,
  `evaluatedAt` DATETIME(3) NOT NULL,
  `eligibleFrom` DATETIME(3) NULL,
  `blockingReason` VARCHAR(191) NULL,
  `withdrawalEndsAt` DATETIME(3) NULL,
  `evidenceSnapshot` JSON NULL,
  UNIQUE INDEX `DailyFarmEligibilityItem_evaluationId_animalId_key` (`evaluationId`, `animalId`),
  INDEX `DailyFarmEligibilityItem_animalId_evaluatedAt_idx` (`animalId`, `evaluatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DailyMilkCollectionClearance` (
  `id` VARCHAR(191) NOT NULL,
  `evaluationId` VARCHAR(191) NOT NULL,
  `clearanceNumber` VARCHAR(100) NOT NULL,
  `verificationId` VARCHAR(191) NOT NULL,
  `generatedById` VARCHAR(191) NULL,
  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `canonicalizationVersion` VARCHAR(40) NOT NULL,
  `canonicalPayload` JSON NOT NULL,
  `contentHashSha256` CHAR(64) NOT NULL,
  `disclaimer` TEXT NOT NULL,
  UNIQUE INDEX `DailyMilkCollectionClearance_evaluationId_key` (`evaluationId`),
  UNIQUE INDEX `DailyMilkCollectionClearance_clearanceNumber_key` (`clearanceNumber`),
  UNIQUE INDEX `DailyMilkCollectionClearance_verificationId_key` (`verificationId`),
  INDEX `DailyMilkCollectionClearance_generatedAt_idx` (`generatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DailyEligibilityJob` (
  `id` VARCHAR(191) NOT NULL,
  `farmId` VARCHAR(191) NOT NULL,
  `businessDate` DATE NOT NULL,
  `status` ENUM('RUNNING', 'COMPLETED', 'FAILED') NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `attemptCount` INTEGER NOT NULL DEFAULT 1,
  UNIQUE INDEX `DailyEligibilityJob_farmId_businessDate_key` (`farmId`, `businessDate`),
  INDEX `DailyEligibilityJob_status_businessDate_idx` (`status`, `businessDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DailyFarmEligibilityEvaluation` ADD CONSTRAINT `DailyFarmEligibilityEvaluation_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DailyFarmEligibilityEvaluation` ADD CONSTRAINT `DailyFarmEligibilityEvaluation_supersededById_fkey` FOREIGN KEY (`supersededById`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DailyMilkCollectionClearance` ADD CONSTRAINT `DailyMilkCollectionClearance_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DailyMilkCollectionClearance` ADD CONSTRAINT `DailyMilkCollectionClearance_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DailyEligibilityJob` ADD CONSTRAINT `DailyEligibilityJob_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
