-- ============================================================
-- DFMS Livestock Platform — Standalone MySQL Schema & Seed File
-- Database: dfms_livestock
--
-- How to import into MySQL:
--   From PowerShell:
--     cmd /c "mysql -u root -p < database\schema.sql"
--   Or from MySQL CLI prompt:
--     SOURCE d:/Mega Project/dfms/database/schema.sql;
-- ============================================================

CREATE DATABASE IF NOT EXISTS `dfms_livestock`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `dfms_livestock`;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- ------------------------------------------------------------
-- Drop existing tables (both PascalCase and old snake_case)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS
  `advisor_messages`, `advisor_conversations`, `alerts`, `amu_aggregations`,
  `animal_profile_events`, `animals`, `antimicrobial_classes`, `audit_logs`,
  `breeds`, `case_messages`, `daily_clearance_batch_jobs`, `daily_clearance_events`,
  `daily_clearance_items`, `daily_clearance_runs`, `daily_eligibility_jobs`,
  `daily_farm_eligibility_evaluations`, `daily_farm_eligibility_items`,
  `daily_milk_collection_clearances`, `dairy_owner_profiles`, `diagnoses`,
  `disease_drug_indications`, `diseases`, `domain_events`, `drug_products`,
  `drug_species`, `drugs`, `eligibility_treatment_evaluations`, `farm_member_roles`,
  `farm_members`, `farmer_profiles`, `farms`, `file_objects`,
  `milk_eligibility_certificates`, `milk_eligibility_checks`, `mrl_reference_rules`,
  `prescription_items`, `prescriptions`, `reference_data_versions`, `refresh_tokens`,
  `regulatory_sources`, `species`, `treatment_administrations`, `treatment_clearance_evaluations`,
  `treatment_requests`, `treatments`, `user_platform_roles`, `users`,
  `veterinarian_profiles`, `veterinarian_service_areas`, `veterinary_cases`,
  `withdrawal_evaluations`, `withdrawal_rules`, `certificate_revocations`, `blockchain_anchors`,
  `dairy_milk_sales`, `dairy_milk_intakes`, `dairy_farmer_enrollments`;

DROP TABLE IF EXISTS `AdvisorMessage`;
DROP TABLE IF EXISTS `AdvisorConversation`;
DROP TABLE IF EXISTS `BlockchainAnchor`;
DROP TABLE IF EXISTS `DomainEvent`;
DROP TABLE IF EXISTS `AuditLog`;
DROP TABLE IF EXISTS `Alert`;
DROP TABLE IF EXISTS `AmuAggregation`;
DROP TABLE IF EXISTS `CertificateRevocation`;
DROP TABLE IF EXISTS `MilkEligibilityCertificate`;
DROP TABLE IF EXISTS `EligibilityTreatmentEvaluation`;
DROP TABLE IF EXISTS `DailyEligibilityJob`;
DROP TABLE IF EXISTS `DailyMilkCollectionClearance`;
DROP TABLE IF EXISTS `DailyFarmEligibilityItem`;
DROP TABLE IF EXISTS `DailyFarmEligibilityEvaluation`;
DROP TABLE IF EXISTS `MilkEligibilityCheck`;
DROP TABLE IF EXISTS `WithdrawalEvaluation`;
DROP TABLE IF EXISTS `TreatmentAdministration`;
DROP TABLE IF EXISTS `Treatment`;
DROP TABLE IF EXISTS `PrescriptionItem`;
DROP TABLE IF EXISTS `Prescription`;
DROP TABLE IF EXISTS `ReferenceDataVersion`;
DROP TABLE IF EXISTS `MrlReferenceRule`;
DROP TABLE IF EXISTS `WithdrawalRule`;
DROP TABLE IF EXISTS `DrugProduct`;
DROP TABLE IF EXISTS `DrugSpecies`;
DROP TABLE IF EXISTS `Drug`;
DROP TABLE IF EXISTS `AntimicrobialClass`;
DROP TABLE IF EXISTS `Diagnosis`;
DROP TABLE IF EXISTS `Disease`;
DROP TABLE IF EXISTS `CaseMessage`;
DROP TABLE IF EXISTS `VeterinaryCase`;
DROP TABLE IF EXISTS `TreatmentRequest`;
DROP TABLE IF EXISTS `FileObject`;
DROP TABLE IF EXISTS `DairyOwnerProfile`;
DROP TABLE IF EXISTS `FarmerProfile`;
DROP TABLE IF EXISTS `VeterinarianServiceArea`;
DROP TABLE IF EXISTS `VeterinarianProfile`;
DROP TABLE IF EXISTS `AnimalProfileEvent`;
DROP TABLE IF EXISTS `Animal`;
DROP TABLE IF EXISTS `Breed`;
DROP TABLE IF EXISTS `Species`;
DROP TABLE IF EXISTS `FarmMemberRole`;
DROP TABLE IF EXISTS `FarmMember`;
DROP TABLE IF EXISTS `Farm`;
DROP TABLE IF EXISTS `UserPlatformRole`;
DROP TABLE IF EXISTS `RefreshToken`;
DROP TABLE IF EXISTS `RegulatorySource`;
DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pendingRole` VARCHAR(32) NULL, 

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `familyId` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `revocationReason` VARCHAR(80) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `replacedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `RefreshToken_userId_familyId_idx`(`userId`, `familyId`),
    INDEX `RefreshToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPlatformRole` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('PLATFORM_ADMIN', 'VETERINARIAN', 'FARMER', 'DAIRY_OWNER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserPlatformRole_userId_role_key`(`userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Farm` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `taluka` VARCHAR(100) NULL,
    `pincode` VARCHAR(12) NULL,
    `timeZone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `regulatoryJurisdiction` VARCHAR(64) NOT NULL DEFAULT 'INDIA',
    `demonstrationMode` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Farm_status_state_district_idx`(`status`, `state`, `district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FarmMember` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED') NOT NULL DEFAULT 'INVITED',
    `joinedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `invitedById` VARCHAR(191) NULL,

    INDEX `FarmMember_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `FarmMember_farmId_userId_key`(`farmId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FarmMemberRole` (
    `id` VARCHAR(191) NOT NULL,
    `farmMemberId` VARCHAR(191) NOT NULL,
    `role` ENUM('FARM_OWNER', 'FARM_MANAGER', 'FARM_WORKER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FarmMemberRole_farmMemberId_role_key`(`farmMemberId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Species` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `canonicalName` VARCHAR(120) NOT NULL,
    `scientificName` VARCHAR(160) NULL,
    `sourceRecordId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Species_code_key`(`code`),
    UNIQUE INDEX `Species_canonicalName_key`(`canonicalName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Breed` (
    `id` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Breed_speciesId_name_key`(`speciesId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Animal` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `breedId` VARCHAR(191) NULL,
    `tagNumber` VARCHAR(100) NOT NULL,
    `name` VARCHAR(120) NULL,
    `sex` VARCHAR(20) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `lactating` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'SOLD', 'DECEASED', 'TRANSFERRED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `verificationId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Animal_verificationId_key`(`verificationId`),
    INDEX `Animal_farmId_status_idx`(`farmId`, `status`),
    UNIQUE INDEX `Animal_farmId_tagNumber_key`(`farmId`, `tagNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `VeterinarianProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(100) NOT NULL,
    `registrationCouncil` VARCHAR(160) NOT NULL,
    `qualification` VARCHAR(255) NOT NULL,
    `specialization` VARCHAR(160) NULL,
    `experienceYears` INTEGER NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `documentName` VARCHAR(255) NULL,
    `documentData` LONGTEXT NULL,

    UNIQUE INDEX `VeterinarianProfile_userId_key`(`userId`),
    INDEX `VeterinarianProfile_status_specialization_idx`(`status`, `specialization`),
    UNIQUE INDEX `VeterinarianProfile_registrationCouncil_registrationNumber_key`(`registrationCouncil`, `registrationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VeterinarianServiceArea` (
    `id` VARCHAR(191) NOT NULL,
    `veterinarianId` VARCHAR(191) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NULL,
    `taluka` VARCHAR(100) NULL,
    `pincode` VARCHAR(12) NULL,

    INDEX `VeterinarianServiceArea_state_district_idx`(`state`, `district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable: DairyFarmerEnrollment (Farmer join requests & directory with location/area filtering)
CREATE TABLE `dairy_farmer_enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `dairyUserId` VARCHAR(191) NOT NULL,
    `farmerUserId` VARCHAR(191) NULL,
    `farmerIdNumber` VARCHAR(100) NOT NULL,
    `farmerName` VARCHAR(160) NOT NULL,
    `farmName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `email` VARCHAR(191) NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `taluka` VARCHAR(100) NULL,
    `villageArea` VARCHAR(120) NOT NULL,
    `pincode` VARCHAR(12) NULL,
    `milkType` ENUM('COW', 'BUFFALO', 'MIXED') NOT NULL DEFAULT 'COW',
    `expectedDailyQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    `agreedRatePerLiter` DECIMAL(10, 2) NOT NULL DEFAULT 42.00,
    `baseFatPercentage` DECIMAL(5, 2) NULL DEFAULT 4.00,
    `baseSnfPercentage` DECIMAL(5, 2) NULL DEFAULT 8.50,
    `paymentMethod` VARCHAR(64) NOT NULL DEFAULT 'BANK_TRANSFER',
    `bankAccountNumber` VARCHAR(64) NULL,
    `bankIfsc` VARCHAR(32) NULL,
    `bankName` VARCHAR(100) NULL,
    `upiId` VARCHAR(100) NULL,
    `status` ENUM('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
    `joinRequestNotes` TEXT NULL,
    `certificateNumber` VARCHAR(100) NULL,
    `certificateVerificationId` VARCHAR(100) NULL,
    `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `idx_dairy_farmer_enrollments_dairy` (`dairyUserId`),
    INDEX `idx_dairy_farmer_enrollments_farmerIdNumber` (`farmerIdNumber`),
    INDEX `idx_dairy_farmer_enrollments_area` (`state`, `district`, `villageArea`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: DairyMilkIntake (Per-farmer milk collection intake & inventory management)
CREATE TABLE `dairy_milk_intakes` (
    `id` VARCHAR(191) NOT NULL,
    `dairyUserId` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NULL,
    `farmerIdNumber` VARCHAR(100) NOT NULL,
    `farmerName` VARCHAR(160) NOT NULL,
    `farmName` VARCHAR(191) NULL,
    `villageArea` VARCHAR(120) NULL,
    `collectionDate` DATE NOT NULL,
    `shift` ENUM('MORNING', 'EVENING') NOT NULL DEFAULT 'MORNING',
    `milkType` ENUM('COW', 'BUFFALO', 'MIXED') NOT NULL DEFAULT 'COW',
    `quantityLiters` DECIMAL(10, 2) NOT NULL,
    `fatPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 4.00,
    `snfPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 8.50,
    `ratePerLiter` DECIMAL(10, 2) NOT NULL,
    `totalCost` DECIMAL(12, 2) NOT NULL,
    `storageTank` VARCHAR(64) NOT NULL DEFAULT 'Silo-1',
    `eligibilityStatus` VARCHAR(64) NOT NULL DEFAULT 'CLEARED',
    `paymentStatus` ENUM('PAID', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `qualityGrade` VARCHAR(32) NOT NULL DEFAULT 'GRADE_A',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_dairy_milk_intakes_dairy_date` (`dairyUserId`, `collectionDate`),
    INDEX `idx_dairy_milk_intakes_farmer` (`farmerIdNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: DairyMilkSale (Dairy sales tracking & daily/monthly sales analytics)
CREATE TABLE `dairy_milk_sales` (
    `id` VARCHAR(191) NOT NULL,
    `dairyUserId` VARCHAR(191) NOT NULL,
    `saleDate` DATE NOT NULL,
    `invoiceNumber` VARCHAR(64) NOT NULL,
    `buyerName` VARCHAR(160) NOT NULL,
    `buyerType` ENUM('RETAIL_CONSUMER', 'COMMERCIAL_SHOP', 'WHOLESALE_DISTRIBUTOR', 'PROCESSING_PLANT') NOT NULL DEFAULT 'RETAIL_CONSUMER',
    `milkType` ENUM('COW', 'BUFFALO', 'TONED', 'STANDARDIZED', 'MIXED') NOT NULL DEFAULT 'COW',
    `quantityLiters` DECIMAL(10, 2) NOT NULL,
    `pricePerLiter` DECIMAL(10, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `dispensedFromTank` VARCHAR(64) NOT NULL DEFAULT 'Silo-1',
    `paymentStatus` ENUM('PAID', 'PENDING', 'PARTIAL') NOT NULL DEFAULT 'PAID',
    `paymentMethod` VARCHAR(64) NOT NULL DEFAULT 'CASH',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idx_dairy_milk_sales_invoice` (`invoiceNumber`),
    INDEX `idx_dairy_milk_sales_dairy_date` (`dairyUserId`, `saleDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileObject` (
    `id` VARCHAR(191) NOT NULL,
    `bucket` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(512) NOT NULL,
    `mimeType` VARCHAR(160) NOT NULL,
    `extension` VARCHAR(20) NULL,
    `sizeBytes` BIGINT NOT NULL,
    `checksumSha256` CHAR(64) NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `veterinarianProfileId` VARCHAR(191) NULL,
    `caseMessageId` VARCHAR(191) NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(80) NOT NULL,
    `status` ENUM('PENDING_UPLOAD', 'AVAILABLE', 'QUARANTINED', 'DELETED') NOT NULL DEFAULT 'PENDING_UPLOAD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `availableAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `FileObject_objectKey_key`(`objectKey`),
    INDEX `FileObject_entityType_entityId_purpose_idx`(`entityType`, `entityId`, `purpose`),
    INDEX `FileObject_ownerUserId_status_idx`(`ownerUserId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `requestedVeterinarianId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `observations` TEXT NOT NULL,
    `symptoms` TEXT NULL,
    `urgency` ENUM('ROUTINE', 'SOON', 'URGENT', 'EMERGENCY') NOT NULL DEFAULT 'ROUTINE',
    `status` ENUM('OPEN', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'REQUESTED',
    `responseNotes` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TreatmentRequest_requestedVeterinarianId_status_createdAt_idx`(`requestedVeterinarianId`, `status`, `createdAt`),
    INDEX `TreatmentRequest_farmId_status_idx`(`farmId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VeterinaryCase` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `veterinarianId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'TREATMENT_STARTED', 'FOLLOW_UP', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VeterinaryCase_requestId_key`(`requestId`),
    INDEX `VeterinaryCase_veterinarianId_status_idx`(`veterinarianId`, `status`),
    INDEX `VeterinaryCase_farmId_status_idx`(`farmId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaseMessage` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `CaseMessage_caseId_sentAt_idx`(`caseId`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Disease` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `canonicalName` VARCHAR(191) NOT NULL,
    `antimicrobialRelevance` VARCHAR(100) NOT NULL,
    `sourceRecordId` VARCHAR(100) NULL,

    UNIQUE INDEX `Disease_code_key`(`code`),
    UNIQUE INDEX `Disease_canonicalName_key`(`canonicalName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diagnosis` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `veterinarianId` VARCHAR(191) NOT NULL,
    `diseaseId` VARCHAR(191) NULL,
    `clinicalNotes` TEXT NOT NULL,
    `diagnosedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `followUpNotes` TEXT NULL,

    INDEX `Diagnosis_animalId_diagnosedAt_idx`(`animalId`, `diagnosedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Medicine` (
    `id` VARCHAR(191) NOT NULL,
    `medicineName` VARCHAR(255) NOT NULL,
    `antimicrobialClass` VARCHAR(120) NOT NULL,
    `isAntibiotic` BOOLEAN NOT NULL DEFAULT FALSE,
    `milkWithdrawalDays` INT NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferenceDataVersion` (
    `id` VARCHAR(191) NOT NULL,
    `datasetName` VARCHAR(120) NOT NULL,
    `version` VARCHAR(80) NOT NULL,
    `checksumSha256` CHAR(64) NOT NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `importedById` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `ReferenceDataVersion_datasetName_version_key`(`datasetName`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prescription` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `veterinarianId` VARCHAR(191) NOT NULL,
    `diagnosisId` VARCHAR(191) NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    `instructions` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `expectedEndDate` DATETIME(3) NULL,
    `prescribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Prescription_caseId_prescribedAt_idx`(`caseId`, `prescribedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrescriptionItem` (
    `id` VARCHAR(191) NOT NULL,
    `prescriptionId` VARCHAR(191) NOT NULL,
    `medicineId` VARCHAR(191) NOT NULL,
    `doseValue` DECIMAL(18, 6) NOT NULL,
    `doseUnit` VARCHAR(60) NOT NULL,
    `doseBasis` VARCHAR(60) NULL,
    `route` VARCHAR(100) NOT NULL,
    `frequency` VARCHAR(100) NOT NULL,
    `durationValue` DECIMAL(12, 3) NOT NULL,
    `durationUnit` VARCHAR(40) NOT NULL,
    `instructions` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `expectedEndDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Treatment` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `veterinarianId` VARCHAR(191) NOT NULL,
    `prescriptionId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `completionNotes` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Treatment_animalId_status_completedAt_idx`(`animalId`, `status`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentAdministration` (
    `id` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `prescriptionItemId` VARCHAR(191) NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `medicineId` VARCHAR(191) NOT NULL,
    `administeredById` VARCHAR(191) NOT NULL,
    `performedByUserId` VARCHAR(191) NULL,
    `performedByName` VARCHAR(160) NULL,
    `amount` DECIMAL(18, 6) NOT NULL,
    `amountUnit` VARCHAR(60) NOT NULL,
    `activeIngredientMg` DECIMAL(20, 6) NULL,
    `conversionProvenance` VARCHAR(255) NULL,
    `route` VARCHAR(100) NOT NULL,
    `administeredAt` DATETIME(3) NOT NULL,
    `animalWeightKg` DECIMAL(10, 3) NULL,
    `weightMeasuredAt` DATETIME(3) NULL,
    `batchNumber` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `deviationReason` TEXT NULL,

    INDEX `TreatmentAdministration_animalId_administeredAt_idx`(`animalId`, `administeredAt`),
    INDEX `TreatmentAdministration_medicineId_administeredAt_idx`(`medicineId`, `administeredAt`),
    INDEX `TreatmentAdministration_performedByUserId_idx`(`performedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MilkEligibilityCheck` (
    `id` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `status` ENUM('TREATMENT_ACTIVE', 'UNDER_WITHDRAWAL', 'ELIGIBLE_FOR_MILK', 'RULE_NOT_FOUND', 'REVIEW_REQUIRED') NOT NULL,
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eligibilityDate` DATETIME(3) NULL,
    `inputHash` CHAR(64) NOT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `explanation` JSON NOT NULL,
    `methodologyVersion` VARCHAR(80) NOT NULL,
    `triggeredBy` VARCHAR(80) NOT NULL,

    INDEX `MilkEligibilityCheck_animalId_evaluatedAt_idx`(`animalId`, `evaluatedAt`),
    INDEX `MilkEligibilityCheck_farmId_status_isCurrent_idx`(`farmId`, `status`, `isCurrent`),
    INDEX `MilkEligibilityCheck_status_evaluatedAt_idx`(`status`, `evaluatedAt`),
    UNIQUE INDEX `MilkEligibilityCheck_animalId_inputHash_key`(`animalId`, `inputHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

    UNIQUE INDEX `DailyFarmEligibilityEvaluation_supersededById_key`(`supersededById`),
    UNIQUE INDEX `DailyFarmEligibilityEvaluation_currentSlot_key`(`currentSlot`),
    INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_snapshotH_idx`(`farmId`, `businessDate`, `snapshotHashSha256`),
    INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_status_idx`(`farmId`, `businessDate`, `status`),
    UNIQUE INDEX `DailyFarmEligibilityEvaluation_farmId_businessDate_version_key`(`farmId`, `businessDate`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

    INDEX `DailyFarmEligibilityItem_animalId_evaluatedAt_idx`(`animalId`, `evaluatedAt`),
    UNIQUE INDEX `DailyFarmEligibilityItem_evaluationId_animalId_key`(`evaluationId`, `animalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

    UNIQUE INDEX `DailyMilkCollectionClearance_evaluationId_key`(`evaluationId`),
    UNIQUE INDEX `DailyMilkCollectionClearance_clearanceNumber_key`(`clearanceNumber`),
    UNIQUE INDEX `DailyMilkCollectionClearance_verificationId_key`(`verificationId`),
    INDEX `DailyMilkCollectionClearance_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyEligibilityJob` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `status` ENUM('RUNNING', 'COMPLETED', 'FAILED') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 1,

    INDEX `DailyEligibilityJob_status_businessDate_idx`(`status`, `businessDate`),
    UNIQUE INDEX `DailyEligibilityJob_farmId_businessDate_key`(`farmId`, `businessDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EligibilityTreatmentEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `eligibilityCheckId` VARCHAR(191) NOT NULL,
    `evidenceScopeHash` CHAR(64) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `medicineId` VARCHAR(191) NULL,
    `route` VARCHAR(100) NULL,
    `lastAdministrationAt` DATETIME(3) NULL,
    `status` ENUM('TREATMENT_ACTIVE', 'UNDER_WITHDRAWAL', 'ELIGIBLE_FOR_MILK', 'RULE_NOT_FOUND', 'REVIEW_REQUIRED') NOT NULL,
    `treatmentCompletedAt` DATETIME(3) NULL,
    `withdrawalEndsAt` DATETIME(3) NULL,
    `ruleSnapshot` JSON NULL,
    `blockerCode` VARCHAR(100) NULL,

    UNIQUE INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_evidenceSc_key`(`eligibilityCheckId`, `evidenceScopeHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MilkEligibilityCertificate` (
    `id` VARCHAR(191) NOT NULL,
    `certificateNumber` VARCHAR(100) NOT NULL,
    `verificationId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `eligibilityCheckId` VARCHAR(191) NOT NULL,
    `issuedById` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'SUPERSEDED') NOT NULL DEFAULT 'ACTIVE',
    `canonicalizationVersion` VARCHAR(40) NOT NULL,
    `canonicalPayload` JSON NOT NULL,
    `contentHashSha256` CHAR(64) NOT NULL,
    `disclaimer` TEXT NOT NULL,
    `eligibleFrom` DATETIME(3) NOT NULL,
    `certificateVersion` INTEGER NOT NULL DEFAULT 1,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedById` VARCHAR(191) NULL,
    `revocationCode` VARCHAR(80) NULL,
    `revocationReason` TEXT NULL,
    `supersededById` VARCHAR(191) NULL,

    UNIQUE INDEX `MilkEligibilityCertificate_certificateNumber_key`(`certificateNumber`),
    UNIQUE INDEX `MilkEligibilityCertificate_verificationId_key`(`verificationId`),
    UNIQUE INDEX `MilkEligibilityCertificate_eligibilityCheckId_key`(`eligibilityCheckId`),
    UNIQUE INDEX `MilkEligibilityCertificate_supersededById_key`(`supersededById`),
    INDEX `MilkEligibilityCertificate_animalId_status_issuedAt_idx`(`animalId`, `status`, `issuedAt`),
    INDEX `MilkEligibilityCertificate_farmId_status_issuedAt_idx`(`farmId`, `status`, `issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmuAggregation` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `metricCode` VARCHAR(100) NOT NULL,
    `methodologyVersion` VARCHAR(80) NOT NULL,
    `dimensionType` VARCHAR(80) NULL,
    `dimensionValue` VARCHAR(191) NULL,
    `numerator` DECIMAL(24, 6) NOT NULL,
    `denominator` DECIMAL(24, 6) NULL,
    `value` DECIMAL(24, 6) NOT NULL,
    `unit` VARCHAR(80) NOT NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AmuAggregation_farmId_metricCode_periodStart_idx`(`farmId`, `metricCode`, `periodStart`),
    UNIQUE INDEX `AmuAggregation_farmId_periodStart_periodEnd_metricCode_dimen_key`(`farmId`, `periodStart`, `periodEnd`, `metricCode`, `dimensionType`, `dimensionValue`, `methodologyVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NULL,
    `type` VARCHAR(80) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `entityType` VARCHAR(80) NULL,
    `entityId` VARCHAR(191) NULL,
    `status` ENUM('UNREAD', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'UNREAD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,
    `dedupKey` VARCHAR(191) NULL,

    UNIQUE INDEX `Alert_dedupKey_key`(`dedupKey`),
    INDEX `Alert_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(120) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NULL,
    `requestId` VARCHAR(80) NULL,
    `previousData` JSON NULL,
    `newData` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    INDEX `AuditLog_farmId_createdAt_idx`(`farmId`, `createdAt`),
    INDEX `AuditLog_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DomainEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(120) NOT NULL,
    `aggregateType` VARCHAR(80) NOT NULL,
    `aggregateId` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DomainEvent_status_availableAt_idx`(`status`, `availableAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlockchainAnchor` (
    `id` VARCHAR(191) NOT NULL,
    `recordType` VARCHAR(80) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `chainId` VARCHAR(80) NULL,
    `contractAddress` VARCHAR(100) NULL,
    `transactionHash` VARCHAR(100) NULL,
    `blockNumber` BIGINT NULL,
    `status` ENUM('PENDING', 'ANCHORED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `anchoredAt` DATETIME(3) NULL,
    `lastErrorCode` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlockchainAnchor_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `BlockchainAnchor_recordType_recordId_contentHash_key`(`recordType`, `recordId`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdvisorConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdvisorConversation_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdvisorMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` TEXT NOT NULL,
    `sources` JSON NULL,
    `contextTypes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdvisorMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPlatformRole` ADD CONSTRAINT `UserPlatformRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Farm` ADD CONSTRAINT `Farm_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmMember` ADD CONSTRAINT `FarmMember_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmMember` ADD CONSTRAINT `FarmMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmMemberRole` ADD CONSTRAINT `FarmMemberRole_farmMemberId_fkey` FOREIGN KEY (`farmMemberId`) REFERENCES `FarmMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Breed` ADD CONSTRAINT `Breed_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_breedId_fkey` FOREIGN KEY (`breedId`) REFERENCES `Breed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalProfileEvent` ADD CONSTRAINT `AnimalProfileEvent_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinarianProfile` ADD CONSTRAINT `VeterinarianProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinarianProfile` ADD CONSTRAINT `VeterinarianProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinarianServiceArea` ADD CONSTRAINT `VeterinarianServiceArea_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmerProfile` ADD CONSTRAINT `FarmerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmerProfile` ADD CONSTRAINT `FarmerProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DairyOwnerProfile` ADD CONSTRAINT `DairyOwnerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DairyOwnerProfile` ADD CONSTRAINT `DairyOwnerProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_veterinarianProfileId_fkey` FOREIGN KEY (`veterinarianProfileId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_caseMessageId_fkey` FOREIGN KEY (`caseMessageId`) REFERENCES `CaseMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_requestedVeterinarianId_fkey` FOREIGN KEY (`requestedVeterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinaryCase` ADD CONSTRAINT `VeterinaryCase_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `TreatmentRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinaryCase` ADD CONSTRAINT `VeterinaryCase_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinaryCase` ADD CONSTRAINT `VeterinaryCase_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinaryCase` ADD CONSTRAINT `VeterinaryCase_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseMessage` ADD CONSTRAINT `CaseMessage_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseMessage` ADD CONSTRAINT `CaseMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_diseaseId_fkey` FOREIGN KEY (`diseaseId`) REFERENCES `Disease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `Prescription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_administeredById_fkey` FOREIGN KEY (`administeredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_performedByUserId_fkey` FOREIGN KEY (`performedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `PrescriptionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCheck` ADD CONSTRAINT `MilkEligibilityCheck_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCheck` ADD CONSTRAINT `MilkEligibilityCheck_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyFarmEligibilityEvaluation` ADD CONSTRAINT `DailyFarmEligibilityEvaluation_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyFarmEligibilityEvaluation` ADD CONSTRAINT `DailyFarmEligibilityEvaluation_supersededById_fkey` FOREIGN KEY (`supersededById`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyFarmEligibilityItem` ADD CONSTRAINT `DailyFarmEligibilityItem_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyMilkCollectionClearance` ADD CONSTRAINT `DailyMilkCollectionClearance_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `DailyFarmEligibilityEvaluation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyMilkCollectionClearance` ADD CONSTRAINT `DailyMilkCollectionClearance_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyEligibilityJob` ADD CONSTRAINT `DailyEligibilityJob_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_revokedById_fkey` FOREIGN KEY (`revokedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_supersededById_fkey` FOREIGN KEY (`supersededById`) REFERENCES `MilkEligibilityCertificate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvisorConversation` ADD CONSTRAINT `AdvisorConversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvisorMessage` ADD CONSTRAINT `AdvisorMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `AdvisorConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `AnimalRiskAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NULL,
    `veterinarianId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `species` VARCHAR(60) NOT NULL,
    `ageYears` DECIMAL(6, 2) NOT NULL,
    `weightKg` DECIMAL(8, 2) NOT NULL,
    `treatmentsLast30d` INTEGER NOT NULL,
    `treatmentsLast90d` INTEGER NOT NULL,
    `daysSinceLastTreatment` INTEGER NOT NULL,
    `uniqueAntimicrobialClasses90d` INTEGER NOT NULL,
    `maxRepeatedClassCount90d` INTEGER NOT NULL,
    `meanTreatmentIntervalDays` DECIMAL(8, 2) NOT NULL,
    `totalAntimicrobialDays90d` INTEGER NOT NULL,
    `recurrentConditionEvents90d` INTEGER NOT NULL,
    `noResponseEvents90d` INTEGER NOT NULL,
    `partialResponseEvents90d` INTEGER NOT NULL,
    `predictedRisk` VARCHAR(40) NOT NULL,
    `probabilities` JSON NOT NULL,
    `notes` TEXT NULL,
    `recommendations` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnimalRiskAssessment_animalId_createdAt_idx`(`animalId`, `createdAt`),
    INDEX `AnimalRiskAssessment_caseId_idx`(`caseId`),
    INDEX `AnimalRiskAssessment_veterinarianId_idx`(`veterinarianId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnimalRiskAssessment` ADD CONSTRAINT `AnimalRiskAssessment_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalRiskAssessment` ADD CONSTRAINT `AnimalRiskAssessment_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalRiskAssessment` ADD CONSTRAINT `AnimalRiskAssessment_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnimalRiskAssessment` ADD CONSTRAINT `AnimalRiskAssessment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- SEED DATA: REGULATORY REFERENCE SOURCES
-- ============================================================

INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_1', 'SRC-DAHD-BAHS-2025', 'Department of Animal Husbandry and Dairying, Government of India', 'Basic Animal Husbandry Statistics 2025 brochure', 'https://www.dahd.gov.in/sites/default/files/2025-11/BAHS2025Brochure.pdf', 'INDIA', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_2', 'SRC-DAHD-SVTG-2024', 'Department of Animal Husbandry and Dairying, Government of India', 'Standard Veterinary Treatment Guidelines for Livestock and Poultry', 'https://dahd.gov.in/sites/default/files/2024-10/StandardVeterinaryTreatment.pdf', 'INDIA', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_3', 'SRC-DAHD-ANTIBIOTIC-2014', 'Department of Animal Husbandry, Dairying and Fisheries, Government of India', 'Advisory on use of antibiotics for treatment of food-producing animals and in animal feeding', 'https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadPublic_NoticesFiles/Combine.pdf', 'INDIA', '2014-06-03 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_4', 'SRC-CDSCO-DRUG-RULES-1945', 'Central Drugs Standard Control Organization', 'Drugs Rules, 1945 (regulator-hosted compilation)', 'https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/drug_rules/Drugs%20Rules%2C%201945.pdf', 'INDIA', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_5', 'SRC-GAZETTE-GSR28-2012', 'Gazette of India', 'Drugs and Cosmetics (1st Amendment) Rules, 2012, G.S.R. 28(E)', 'https://www.eicindia.gov.in/WebApp1/resources/PDF/GSR-28-withdrawal-period.pdf', 'INDIA', '2012-01-17 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_6', 'SRC-FSSAI-CTR-2025', 'Food Safety and Standards Authority of India', 'Food Safety and Standards (Contaminants, Toxins and Residues) Regulations Compendium, Version VIII', 'https://fssai.gov.in/upload/uploadfiles/files/Comp_Contaminants_Regulations_2_4_2025_VIII.pdf', 'INDIA', '2025-04-01 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_7', 'SRC-FSSAI-AMEND-2026', 'Food Safety and Standards Authority of India', 'Contaminants, Toxins and Residues amendment register, Amendment 17', 'https://www.fssai.gov.in/cms/amendment-fss-contaminants-toxins-and-residues.php', 'INDIA', '2026-05-25 00:00:00.000', '2026-12-01 00:00:00.000', '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_8', 'SRC-DAHD-COLISTIN-2025', 'Department of Animal Husbandry and Dairying, Government of India', 'Rajya Sabha Unstarred Question 3578 answer on antimicrobial use', 'https://www.dahd.gov.in/sites/default/files/2025-04/RS3578.pdf', 'INDIA', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_9', 'SRC-WOAH-TAHC-6.9', 'World Organisation for Animal Health', 'Terrestrial Animal Health Code Chapter 6.9: Monitoring quantities and usage patterns of antimicrobial agents', 'https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/2021/en_chapitre_antibio_monitoring.htm', 'INTERNATIONAL', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_10', 'SRC-WOAH-TAHC-6.10', 'World Organisation for Animal Health', 'Terrestrial Animal Health Code Chapter 6.10: Responsible and prudent use of antimicrobial agents', 'https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/2024/en_chapitre_antibio_use.htm', 'INTERNATIONAL', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_11', 'SRC-FAO-AMU-FARM-2023', 'FAO and WOAH', 'Guidelines on monitoring antimicrobial use at the farm level', 'https://www.fao.org/documents/card/en/c/cc8807en', 'ASIA_PACIFIC', '2023-01-01 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_12', 'SRC-EMA-DDDVET-2015', 'European Medicines Agency', 'Principles on assignment of DDDvet and DCDvet', 'https://www.ema.europa.eu/en/documents/scientific-guideline/principles-assignment-defined-daily-dose-animals-dddvet-and-defined-course-dose-animals-dcdvet_en.pdf', 'EU', '2015-06-30 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_13', 'SRC-EMA-AMU-2023', 'European Medicines Agency', 'Guideline on reporting antimicrobial sales and use in animals: denominators and indicators', 'https://www.ema.europa.eu/en/documents/scientific-guideline/guideline-reporting-antimicrobial-sales-and-use-animals-eu-level-denominators-and-indicators_en.pdf', 'EU', '2023-01-01 00:00:00.000', NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_14', 'SRC-EU-UPD-LAMOXSAN', 'European Union Veterinary Medicines Information', 'Lamoxsan 150 mg/ml suspension for injection for cattle and pigs', 'https://medicines.health.europa.eu/veterinary/en/600000986151', 'IRELAND', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_15', 'SRC-EU-UPD-REDYMOX', 'European Union Veterinary Medicines Information', 'Redymox 150 mg/ml suspension for injection', 'https://medicines.health.europa.eu/veterinary/en/700000186534', 'IRELAND', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_16', 'SRC-EU-UPD-OXTRA', 'European Union Veterinary Medicines Information', 'OXTRA DD 100 mg/ml solution for injection', 'https://medicines.health.europa.eu/veterinary/en/600000050208', 'BELGIUM', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_17', 'SRC-EU-UPD-CEFTIOSAN', 'European Union Veterinary Medicines Information', 'Ceftiosan/Alfacef RTU 50 mg/ml product information', 'https://medicines.health.europa.eu/veterinary/es/documents/secure-download/5074ac5d-1f1d-4d87-b6e2-9748db7ccf12/6bqcwZVDxqN0X2GNNaBho87oUXT4dhH6CEkpj37M', 'EU_MEMBER_STATES_LISTED_BY_SOURCE', NULL, NULL, '2026-08-25 00:00:00.000');
INSERT INTO `RegulatorySource` (`id`, `sourceRecordId`, `organization`, `title`, `url`, `jurisdiction`, `publicationDate`, `effectiveDate`, `retrievalDate`)
VALUES ('src_18', 'SRC-CODEX-VETDRUG', 'Codex Alimentarius Commission', 'Codex veterinary drug residues in food database', 'https://www.fao.org/fao-who-codexalimentarius/codex-texts/dbs/vetdrugs/en/', 'INTERNATIONAL', NULL, NULL, '2026-08-25 00:00:00.000');

-- ============================================================
-- SEED DATA: SPECIES
-- ============================================================

INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_1', 'BOS_TAURUS', 'Cattle', 'Bos taurus', 'SP-BOS-TAURUS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_2', 'BUBALUS_BUBALIS', 'Domestic water buffalo', 'Bubalus bubalis', 'SP-BUBALUS-BUBALIS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_3', 'CAPRA_HIRCUS', 'Goat', 'Capra hircus', 'SP-CAPRA-HIRCUS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_4', 'OVIS_ARIES', 'Sheep', 'Ovis aries', 'SP-OVIS-ARIES');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_5', 'SUS_DOMESTICUS', 'Swine / Pig', 'Sus domesticus', 'SP-SUS-DOMESTICUS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_6', 'CAMELUS_DROMEDARIUS', 'Camel', 'Camelus dromedarius', 'SP-CAMELUS-DROMEDARIUS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_7', 'BOS_GRUNNIENS', 'Yak', 'Bos grunniens', 'SP-BOS-GRUNNIENS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_8', 'EQUUS_CABALLUS', 'Horse / Equine', 'Equus caballus', 'SP-EQUUS-CABALLUS');
INSERT INTO `Species` (`id`, `code`, `canonicalName`, `scientificName`, `sourceRecordId`)
VALUES ('sp_9', 'GALLUS_GALLUS', 'Poultry / Chicken', 'Gallus gallus domesticus', 'SP-GALLUS-GALLUS');

-- ============================================================
-- SEED DATA: ANTIMICROBIAL CLASSES
-- ============================================================

INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_1', 'CLASS-PENICILLIN', 'Penicillins', 'CLASS-PENICILLIN');
INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_2', 'CLASS-TETRACYCLINE', 'Tetracyclines', 'CLASS-TETRACYCLINE');
INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_3', 'CLASS-CEPHALOSPORIN-1G', 'First-generation cephalosporins', 'CLASS-CEPHALOSPORIN-1G');
INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_4', 'CLASS-CEPHALOSPORIN-3G', 'Third-generation cephalosporins', 'CLASS-CEPHALOSPORIN-3G');
INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_5', 'CLASS-FLUOROQUINOLONE', 'Fluoroquinolones', 'CLASS-FLUOROQUINOLONE');
INSERT INTO `AntimicrobialClass` (`id`, `code`, `canonicalName`, `sourceRecordId`)
VALUES ('amc_6', 'CLASS-SULFONAMIDE', 'Sulfonamides', 'CLASS-SULFONAMIDE');

-- ============================================================
-- SEED DATA: DRUGS
-- ============================================================

INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_1', 'DRUG-AMOXICILLIN', 'Amoxicillin', 'amc_1', '["amoxicillin trihydrate"]', 'DRUG-AMOXICILLIN');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_2', 'DRUG-AMPICILLIN', 'Ampicillin', 'amc_1', '[]', 'DRUG-AMPICILLIN');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_3', 'DRUG-BENZYLPENICILLIN', 'Benzylpenicillin', 'amc_1', '["penicillin G"]', 'DRUG-BENZYLPENICILLIN');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_4', 'DRUG-OXYTETRACYCLINE', 'Oxytetracycline', 'amc_2', '["oxytetracycline hydrochloride"]', 'DRUG-OXYTETRACYCLINE');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_5', 'DRUG-CEFTIOFUR', 'Ceftiofur', 'amc_4', '["ceftiofur hydrochloride"]', 'DRUG-CEFTIOFUR');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_6', 'DRUG-CEFAPIRIN', 'Cefapirin', 'amc_3', '["cephapirine","cefapirin sodium"]', 'DRUG-CEFAPIRIN');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_7', 'DRUG-ENROFLOXACIN', 'Enrofloxacin', 'amc_5', '[]', 'DRUG-ENROFLOXACIN');
INSERT INTO `Drug` (`id`, `code`, `canonicalName`, `antimicrobialClassId`, `aliases`, `sourceRecordId`)
VALUES ('drg_8', 'DRUG-SULFADIMIDINE', 'Sulfadimidine', 'amc_6', '["sulfamethazine"]', 'DRUG-SULFADIMIDINE');

-- ============================================================
-- SEED DATA: DISEASES
-- ============================================================

INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_1', 'COND-MASTITIS-CLINICAL', 'Clinical bovine mastitis', 'VETERINARIAN_ASSESSMENT', 'COND-MASTITIS-CLINICAL');
INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_2', 'COND-METRITIS', 'Postpartum metritis or endometritis', 'VETERINARIAN_ASSESSMENT', 'COND-METRITIS');
INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_3', 'COND-BRD', 'Bovine bacterial respiratory disease or pneumonia', 'VETERINARIAN_ASSESSMENT', 'COND-BRD');
INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_4', 'COND-FOOTROT', 'Interdigital necrobacillosis (foot rot)', 'VETERINARIAN_ASSESSMENT', 'COND-FOOTROT');
INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_5', 'COND-HS', 'Haemorrhagic septicaemia', 'URGENT_VETERINARIAN_ASSESSMENT', 'COND-HS');
INSERT INTO `Disease` (`id`, `code`, `canonicalName`, `antimicrobialRelevance`, `sourceRecordId`)
VALUES ('dis_6', 'COND-CALF-ENTERIC', 'Calf bacterial enteritis or septicaemia', 'ONLY_WHEN_BACTERIAL_OR_SYSTEMIC_INVOLVEMENT_ASSESSED', 'COND-CALF-ENTERIC');

-- ============================================================
-- SEED DATA: DRUG-SPECIES RELATIONSHIPS
-- ============================================================

INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_1', 'drg_1', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_2', 'drg_1', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_3', 'drg_2', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_4', 'drg_2', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_5', 'drg_3', 'sp_1', 'CLINICAL_CONTEXT_ONLY');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_6', 'drg_3', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_7', 'drg_4', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_8', 'drg_4', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_9', 'drg_5', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_10', 'drg_5', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_11', 'drg_6', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_12', 'drg_6', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_13', 'drg_7', 'sp_1', 'CLINICAL_CONTEXT_ONLY_HIGH_STEWARDSHIP_PRIORITY');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_14', 'drg_7', 'sp_2', 'REVIEW_REQUIRED');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_15', 'drg_8', 'sp_1', 'SUPPORTED_BY_REFERENCE');
INSERT INTO `DrugSpecies` (`id`, `drugId`, `speciesId`, `status`)
VALUES ('ds_16', 'drg_8', 'sp_2', 'REVIEW_REQUIRED');

-- ============================================================
-- SEED DATA: DRUG PRODUCTS & WITHDRAWAL RULES
-- ============================================================

INSERT INTO `DrugProduct` (`id`, `drugId`, `productName`, `authorizationNumber`, `jurisdiction`, `formulation`, `route`, `sourceRecordId`)
VALUES ('dp_1', 'drg_1', 'Lamoxsan 150 mg/ml suspension for injection for cattle and pigs', 'EU-600000986151', 'IRELAND', 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML', 'INTRAMUSCULAR', 'EU-600000986151');
INSERT INTO `DrugProduct` (`id`, `drugId`, `productName`, `authorizationNumber`, `jurisdiction`, `formulation`, `route`, `sourceRecordId`)
VALUES ('dp_2', 'drg_1', 'Redymox 150 mg/ml suspension for injection', 'EU-700000186534', 'IRELAND', 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML', 'INTRAMUSCULAR_OR_SUBCUTANEOUS', 'EU-700000186534');
INSERT INTO `DrugProduct` (`id`, `drugId`, `productName`, `authorizationNumber`, `jurisdiction`, `formulation`, `route`, `sourceRecordId`)
VALUES ('dp_3', 'drg_4', 'OXTRA DD 100 mg/ml solution for injection', 'EU-600000050208', 'BELGIUM', 'SOLUTION_FOR_INJECTION_100_MG_PER_ML', 'INTRAMUSCULAR_OR_INTRAVENOUS', 'EU-600000050208');
INSERT INTO `DrugProduct` (`id`, `drugId`, `productName`, `authorizationNumber`, `jurisdiction`, `formulation`, `route`, `sourceRecordId`)
VALUES ('dp_4', 'drg_5', 'Ceftiosan/Alfacef RTU 50 mg/ml suspension for injection', 'EU-CEFTIOSAN-50', 'EU_MEMBER_STATES_LISTED_BY_SOURCE', 'SUSPENSION_FOR_INJECTION_50_MG_PER_ML', 'SUBCUTANEOUS', 'EU-CEFTIOSAN-50');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_1', 'WR-IN-STAT-MILK-7D-SP-BOS-TAURUS', 1, NULL, NULL, 'sp_1', 'MILK', 'ANY_AS_LABELLED', 'ANY_AS_LABELLED', '"Only where the specific withdrawal period has not been validated; reviewed product label and domain approval still required."', 7, 'DAY', 'NOT_LESS_THAN', 'INDIA', 'src_5', 'Rule 97(3A)', '2012-01-17 00:00:00.000', 'REVIEW_REQUIRED', 'STATUTORY_MINIMUM', 'BLOCK_UNLESS_DOMAIN_REVIEWER_APPROVES_EXACT_LABEL_CONTEXT');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_2', 'WR-IN-STAT-MILK-7D-SP-BUBALUS-BUBALIS', 1, NULL, NULL, 'sp_2', 'MILK', 'ANY_AS_LABELLED', 'ANY_AS_LABELLED', '"Only where the specific withdrawal period has not been validated; reviewed product label and domain approval still required."', 7, 'DAY', 'NOT_LESS_THAN', 'INDIA', 'src_5', 'Rule 97(3A)', '2012-01-17 00:00:00.000', 'REVIEW_REQUIRED', 'STATUTORY_MINIMUM', 'BLOCK_UNLESS_DOMAIN_REVIEWER_APPROVES_EXACT_LABEL_CONTEXT');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_3', 'WR-IE-LAMOXSAN-CATTLE-MILK-72H', 1, 'drg_1', 'dp_1', 'sp_1', 'MILK', 'INTRAMUSCULAR', 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML', '"Authorized product conditions only"', 72, 'HOUR', 'EXACT_LABEL_PERIOD', 'IRELAND', 'src_14', 'Withdrawal period by route of administration', NULL, 'EXAMPLE_ONLY', 'PRODUCT_SPECIFIC_EXACT', 'ONLY_WHEN_CONFIGURED_JURISDICTION_IS_IRELAND_AND_EXACT_PRODUCT_MATCHES');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_4', 'WR-IE-REDYMOX-CATTLE-MILK-48H', 1, 'drg_1', 'dp_2', 'sp_1', 'MILK', 'INTRAMUSCULAR_OR_SUBCUTANEOUS', 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML', '"Authorized product conditions only"', 48, 'HOUR', 'EXACT_LABEL_PERIOD', 'IRELAND', 'src_15', 'Withdrawal period by route of administration', NULL, 'EXAMPLE_ONLY', 'PRODUCT_SPECIFIC_EXACT', 'ONLY_WHEN_CONFIGURED_JURISDICTION_IS_IRELAND_AND_EXACT_PRODUCT_MATCHES');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_5', 'WR-BE-OXTRA-CATTLE-MILK-72H', 1, 'drg_4', 'dp_3', 'sp_1', 'MILK', 'INTRAMUSCULAR_OR_INTRAVENOUS', 'SOLUTION_FOR_INJECTION_100_MG_PER_ML', '"24-hour dosage regimen stated by source; exact authorized conditions only"', 72, 'HOUR', 'EXACT_LABEL_PERIOD', 'BELGIUM', 'src_16', 'Withdrawal period by route of administration', NULL, 'EXAMPLE_ONLY', 'PRODUCT_SPECIFIC_EXACT', 'ONLY_WHEN_CONFIGURED_JURISDICTION_IS_BELGIUM_AND_EXACT_PRODUCT_AND_REGIMEN_MATCH');
INSERT INTO `WithdrawalRule` (`id`, `code`, `version`, `drugId`, `drugProductId`, `speciesId`, `foodProduct`, `route`, `formulation`, `useConditions`, `durationValue`, `durationUnit`, `durationQualifier`, `jurisdiction`, `sourceId`, `sourceSection`, `effectiveFrom`, `verificationStatus`, `ruleType`, `certificateUse`)
VALUES ('wdr_6', 'WR-EU-CEFTIOSAN-CATTLE-MILK-0H', 1, 'drg_5', 'dp_4', 'sp_1', 'MILK', 'SUBCUTANEOUS', 'SUSPENSION_FOR_INJECTION_50_MG_PER_ML', '"Authorized product and listed jurisdiction conditions only"', 0, 'HOUR', 'EXACT_LABEL_PERIOD', 'EU_MEMBER_STATES_LISTED_BY_SOURCE', 'src_17', 'Withdrawal period', NULL, 'EXAMPLE_ONLY', 'PRODUCT_SPECIFIC_EXACT', 'ONLY_WHEN_EXACT_LISTED_JURISDICTION_AND_PRODUCT_MATCH');

-- ============================================================
-- SEED DATA: MRL REFERENCE RULES
-- ============================================================

INSERT INTO `MrlReferenceRule` (`id`, `code`, `drugId`, `speciesId`, `speciesScope`, `foodProduct`, `value`, `unit`, `jurisdiction`, `sourceId`, `verificationStatus`)
VALUES ('mrl_1', 'MRL-IN-AMPICILLIN-MILK', 'drg_2', NULL, 'NOT_SPECIFIED_BY_ENTRY', 'MILK', 0.01, 'MG_PER_KG', 'INDIA', 'src_6', 'VERIFIED');
INSERT INTO `MrlReferenceRule` (`id`, `code`, `drugId`, `speciesId`, `speciesScope`, `foodProduct`, `value`, `unit`, `jurisdiction`, `sourceId`, `verificationStatus`)
VALUES ('mrl_2', 'MRL-IN-AMOXICILLIN-CATTLE-MILK', 'drg_1', 'sp_1', NULL, 'MILK', 0.004, 'MG_PER_KG', 'INDIA', 'src_6', 'VERIFIED');
INSERT INTO `MrlReferenceRule` (`id`, `code`, `drugId`, `speciesId`, `speciesScope`, `foodProduct`, `value`, `unit`, `jurisdiction`, `sourceId`, `verificationStatus`)
VALUES ('mrl_3', 'MRL-IN-CEFTIOFUR-CATTLE-MILK', 'drg_5', 'sp_1', NULL, 'MILK', 0.1, 'MG_PER_KG', 'INDIA', 'src_6', 'VERIFIED');
INSERT INTO `MrlReferenceRule` (`id`, `code`, `drugId`, `speciesId`, `speciesScope`, `foodProduct`, `value`, `unit`, `jurisdiction`, `sourceId`, `verificationStatus`)
VALUES ('mrl_4', 'MRL-IN-CEFAPIRIN-MILK', 'drg_6', NULL, 'NOT_SPECIFIED_BY_ENTRY', 'MILK', 0.01, 'MG_PER_KG', 'INDIA', 'src_6', 'REVIEW_REQUIRED');
INSERT INTO `MrlReferenceRule` (`id`, `code`, `drugId`, `speciesId`, `speciesScope`, `foodProduct`, `value`, `unit`, `jurisdiction`, `sourceId`, `verificationStatus`)
VALUES ('mrl_5', 'MRL-IN-SULFADIMIDINE-CATTLE-MILK', 'drg_8', 'sp_1', NULL, 'MILK', 0.025, 'MG_PER_KG', 'INDIA', 'src_6', 'VERIFIED');

-- ============================================================
-- SEED DATA: PLATFORM ADMINISTRATORS
-- ============================================================

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_admin_manthan', 'manthan@gmail.com', 'Manthan', '$argon2id$v=19$m=65536,t=3,p=4$fz/YD9vGQZC2Ek2CV3ZxtQ$6QL/J1XzCW9krvETOOTWHid6mW9HEmtst9SUfxs2SoE', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_admin_manthan', 'usr_admin_manthan', 'PLATFORM_ADMIN')
ON DUPLICATE KEY UPDATE `role` = 'PLATFORM_ADMIN';

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_admin_shivam', 'shivam@gmail.com', 'Shivam', '$argon2id$v=19$m=65536,t=3,p=4$RoyUFnbXmuEJvhTUpLKD/Q$33OlgiisB5BRus9OiRWwNa/l64Ch5p9/NZG7wLDXaH0', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_admin_shivam', 'usr_admin_shivam', 'PLATFORM_ADMIN')
ON DUPLICATE KEY UPDATE `role` = 'PLATFORM_ADMIN';

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_admin_rushi', 'rushi@gmail.com', 'Rushi', '$argon2id$v=19$m=65536,t=3,p=4$9j1Z2Lu89j6wo6EBt5QDBw$MvpP+z42zwdEGdo96sL12e0Yys2NC90hYvTIYtSb1s8', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_admin_rushi', 'usr_admin_rushi', 'PLATFORM_ADMIN')
ON DUPLICATE KEY UPDATE `role` = 'PLATFORM_ADMIN';

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_admin_tejas', 'tejas@gmail.com', 'Tejas', '$argon2id$v=19$m=65536,t=3,p=4$ioN98TuMxPGdtalIS4gC+A$SqMbZNtmwdrz1d269+DLQcjS5+BeotJphbPUUdaisU4', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_admin_tejas', 'usr_admin_tejas', 'PLATFORM_ADMIN')
ON DUPLICATE KEY UPDATE `role` = 'PLATFORM_ADMIN';

-- ============================================================
-- SEED DATA: DEMO ROLES (Farmer, Vet, Dairy)
-- Password for demo accounts: DemoOnly!234
-- ============================================================

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_demo_admin', 'admin@example.local', 'Demo Platform Admin', '$argon2id$v=19$m=65536,t=3,p=4$zsY5wzammKvQbt4L2u5IDA$egdq5gDMCQALQLb4avIkkLuwYuHnZvHrY3q46B6oImE', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_demo_admin', 'usr_demo_admin', 'PLATFORM_ADMIN');

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_demo_farmer', 'farmer@example.local', 'Demo Farmer', '$argon2id$v=19$m=65536,t=3,p=4$zsY5wzammKvQbt4L2u5IDA$egdq5gDMCQALQLb4avIkkLuwYuHnZvHrY3q46B6oImE', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_demo_farmer', 'usr_demo_farmer', 'FARMER');

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_demo_vet', 'vet@example.local', 'Dr Demo Veterinarian', '$argon2id$v=19$m=65536,t=3,p=4$zsY5wzammKvQbt4L2u5IDA$egdq5gDMCQALQLb4avIkkLuwYuHnZvHrY3q46B6oImE', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_demo_vet', 'usr_demo_vet', 'VETERINARIAN');

INSERT INTO `User` (`id`, `email`, `fullName`, `passwordHash`, `status`, `updatedAt`)
VALUES ('usr_demo_dairy', 'dairy@example.local', 'Demo Dairy Owner', '$argon2id$v=19$m=65536,t=3,p=4$zsY5wzammKvQbt4L2u5IDA$egdq5gDMCQALQLb4avIkkLuwYuHnZvHrY3q46B6oImE', 'ACTIVE', NOW(3))
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

INSERT INTO `UserPlatformRole` (`id`, `userId`, `role`)
VALUES ('upr_usr_demo_dairy', 'usr_demo_dairy', 'DAIRY_OWNER');

INSERT INTO `VeterinarianProfile` (`id`, `userId`, `registrationNumber`, `registrationCouncil`, `qualification`, `specialization`, `experienceYears`, `status`, `reviewedById`, `reviewedAt`, `reviewNotes`, `updatedAt`)
VALUES ('vp_demo_vet', 'usr_demo_vet', 'DEMO-VET-001', 'State Veterinary Council', 'B.V.Sc. & A.H.', 'Bovine Medicine', 8, 'VERIFIED', 'usr_admin_manthan', NOW(3), 'Pre-verified demonstration account', NOW(3));

INSERT INTO `VeterinarianServiceArea` (`id`, `veterinarianId`, `state`, `district`)
VALUES ('vsa_demo_vet', 'vp_demo_vet', 'Karnataka', 'Mysuru');

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- ============================================================
-- End of DFMS Single-File MySQL Schema & Seed
-- ============================================================
