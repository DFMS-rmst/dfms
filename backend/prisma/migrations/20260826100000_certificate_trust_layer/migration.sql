ALTER TABLE `MilkEligibilityCertificate`
  ADD COLUMN `farmId` VARCHAR(191) NOT NULL,
  ADD COLUMN `issuedById` VARCHAR(191) NULL,
  ADD COLUMN `eligibleFrom` DATETIME(3) NOT NULL,
  ADD COLUMN `certificateVersion` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `revokedById` VARCHAR(191) NULL,
  ADD COLUMN `revocationCode` VARCHAR(80) NULL;

ALTER TABLE `MilkEligibilityCertificate`
  MODIFY `status` ENUM('ACTIVE', 'REVOKED', 'SUPERSEDED') NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX `MilkEligibilityCertificate_farmId_status_issuedAt_idx`
  ON `MilkEligibilityCertificate`(`farmId`, `status`, `issuedAt`);

ALTER TABLE `MilkEligibilityCertificate`
  ADD CONSTRAINT `MilkEligibilityCertificate_farmId_fkey`
    FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `MilkEligibilityCertificate_issuedById_fkey`
    FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MilkEligibilityCertificate_revokedById_fkey`
    FOREIGN KEY (`revokedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX `BlockchainAnchor_recordType_recordId_contentHash_chainId_key` ON `BlockchainAnchor`;
ALTER TABLE `BlockchainAnchor`
  MODIFY `chainId` VARCHAR(80) NULL,
  MODIFY `contractAddress` VARCHAR(100) NULL;
CREATE UNIQUE INDEX `BlockchainAnchor_recordType_recordId_contentHash_key`
  ON `BlockchainAnchor`(`recordType`, `recordId`, `contentHash`);
