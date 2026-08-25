-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

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
    `role` ENUM('PLATFORM_ADMIN') NOT NULL,
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
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Animal_farmId_active_idx`(`farmId`, `active`),
    UNIQUE INDEX `Animal_farmId_tagNumber_key`(`farmId`, `tagNumber`),
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
CREATE TABLE `FileObject` (
    `id` VARCHAR(191) NOT NULL,
    `bucket` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(512) NOT NULL,
    `mimeType` VARCHAR(160) NOT NULL,
    `extension` VARCHAR(20) NULL,
    `sizeBytes` BIGINT NOT NULL,
    `checksumSha256` CHAR(64) NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
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
CREATE TABLE `AntimicrobialClass` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `canonicalName` VARCHAR(160) NOT NULL,
    `sourceRecordId` VARCHAR(100) NULL,

    UNIQUE INDEX `AntimicrobialClass_code_key`(`code`),
    UNIQUE INDEX `AntimicrobialClass_canonicalName_key`(`canonicalName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Drug` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `canonicalName` VARCHAR(160) NOT NULL,
    `antimicrobialClassId` VARCHAR(191) NULL,
    `aliases` JSON NULL,
    `sourceRecordId` VARCHAR(100) NULL,

    UNIQUE INDEX `Drug_code_key`(`code`),
    UNIQUE INDEX `Drug_canonicalName_key`(`canonicalName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DrugSpecies` (
    `id` VARCHAR(191) NOT NULL,
    `drugId` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `DrugSpecies_drugId_speciesId_key`(`drugId`, `speciesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DrugProduct` (
    `id` VARCHAR(191) NOT NULL,
    `drugId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(255) NOT NULL,
    `authorizationNumber` VARCHAR(120) NULL,
    `jurisdiction` VARCHAR(100) NOT NULL,
    `formulation` VARCHAR(160) NOT NULL,
    `concentration` DECIMAL(18, 6) NULL,
    `concentrationUnit` VARCHAR(60) NULL,
    `route` VARCHAR(100) NOT NULL,
    `labelVersion` VARCHAR(80) NULL,
    `sourceRecordId` VARCHAR(100) NULL,

    INDEX `DrugProduct_drugId_jurisdiction_idx`(`drugId`, `jurisdiction`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegulatorySource` (
    `id` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(100) NOT NULL,
    `organization` VARCHAR(255) NOT NULL,
    `title` VARCHAR(512) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `jurisdiction` VARCHAR(100) NOT NULL,
    `publicationDate` DATETIME(3) NULL,
    `effectiveDate` DATETIME(3) NULL,
    `retrievalDate` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RegulatorySource_sourceRecordId_key`(`sourceRecordId`),
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
    `drugId` VARCHAR(191) NOT NULL,
    `drugProductId` VARCHAR(191) NULL,
    `doseValue` DECIMAL(18, 6) NOT NULL,
    `doseUnit` VARCHAR(60) NOT NULL,
    `doseBasis` VARCHAR(60) NULL,
    `route` VARCHAR(100) NOT NULL,
    `frequency` VARCHAR(100) NOT NULL,
    `durationValue` DECIMAL(12, 3) NOT NULL,
    `durationUnit` VARCHAR(40) NOT NULL,
    `instructions` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Treatment` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `prescriptionId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `completionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Treatment_animalId_status_completedAt_idx`(`animalId`, `status`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentAdministration` (
    `id` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `drugId` VARCHAR(191) NOT NULL,
    `drugProductId` VARCHAR(191) NULL,
    `administeredById` VARCHAR(191) NOT NULL,
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

    INDEX `TreatmentAdministration_animalId_administeredAt_idx`(`animalId`, `administeredAt`),
    INDEX `TreatmentAdministration_drugId_administeredAt_idx`(`drugId`, `administeredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WithdrawalRule` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `drugId` VARCHAR(191) NOT NULL,
    `drugProductId` VARCHAR(191) NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `foodProduct` VARCHAR(60) NOT NULL,
    `route` VARCHAR(100) NOT NULL,
    `formulation` VARCHAR(160) NULL,
    `useConditions` JSON NULL,
    `durationValue` DECIMAL(12, 3) NOT NULL,
    `durationUnit` VARCHAR(40) NOT NULL,
    `durationQualifier` VARCHAR(60) NOT NULL,
    `jurisdiction` VARCHAR(100) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `sourceSection` VARCHAR(255) NULL,
    `effectiveFrom` DATETIME(3) NULL,
    `effectiveTo` DATETIME(3) NULL,
    `verificationStatus` ENUM('VERIFIED', 'NOT_AVAILABLE', 'RULE_NOT_FOUND', 'CONFLICTING_SOURCE', 'REVIEW_REQUIRED', 'EXAMPLE_ONLY') NOT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `WithdrawalRule_drugId_speciesId_foodProduct_jurisdiction_ver_idx`(`drugId`, `speciesId`, `foodProduct`, `jurisdiction`, `verificationStatus`),
    UNIQUE INDEX `WithdrawalRule_code_version_key`(`code`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MrlReferenceRule` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `drugId` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NULL,
    `speciesScope` VARCHAR(160) NULL,
    `foodProduct` VARCHAR(80) NOT NULL,
    `value` DECIMAL(18, 6) NOT NULL,
    `unit` VARCHAR(40) NOT NULL,
    `jurisdiction` VARCHAR(100) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `verificationStatus` ENUM('VERIFIED', 'NOT_AVAILABLE', 'RULE_NOT_FOUND', 'CONFLICTING_SOURCE', 'REVIEW_REQUIRED', 'EXAMPLE_ONLY') NOT NULL,

    UNIQUE INDEX `MrlReferenceRule_code_key`(`code`),
    INDEX `MrlReferenceRule_drugId_foodProduct_jurisdiction_idx`(`drugId`, `foodProduct`, `jurisdiction`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MilkEligibilityCheck` (
    `id` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `status` ENUM('TREATMENT_ACTIVE', 'UNDER_WITHDRAWAL', 'ELIGIBLE_FOR_MILK', 'RULE_NOT_FOUND', 'REVIEW_REQUIRED') NOT NULL,
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `explanation` JSON NOT NULL,
    `methodologyVersion` VARCHAR(80) NOT NULL,
    `triggeredBy` VARCHAR(80) NOT NULL,

    INDEX `MilkEligibilityCheck_animalId_evaluatedAt_idx`(`animalId`, `evaluatedAt`),
    INDEX `MilkEligibilityCheck_status_evaluatedAt_idx`(`status`, `evaluatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EligibilityTreatmentEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `eligibilityCheckId` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `withdrawalRuleId` VARCHAR(191) NULL,
    `status` ENUM('TREATMENT_ACTIVE', 'UNDER_WITHDRAWAL', 'ELIGIBLE_FOR_MILK', 'RULE_NOT_FOUND', 'REVIEW_REQUIRED') NOT NULL,
    `treatmentCompletedAt` DATETIME(3) NULL,
    `withdrawalEndsAt` DATETIME(3) NULL,
    `ruleSnapshot` JSON NULL,
    `blockerCode` VARCHAR(100) NULL,

    UNIQUE INDEX `EligibilityTreatmentEvaluation_eligibilityCheckId_treatmentI_key`(`eligibilityCheckId`, `treatmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MilkEligibilityCertificate` (
    `id` VARCHAR(191) NOT NULL,
    `certificateNumber` VARCHAR(100) NOT NULL,
    `verificationId` VARCHAR(191) NOT NULL,
    `animalId` VARCHAR(191) NOT NULL,
    `eligibilityCheckId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'SUPERSEDED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `canonicalizationVersion` VARCHAR(40) NOT NULL,
    `canonicalPayload` JSON NOT NULL,
    `contentHashSha256` CHAR(64) NOT NULL,
    `disclaimer` TEXT NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revocationReason` TEXT NULL,
    `supersededById` VARCHAR(191) NULL,

    UNIQUE INDEX `MilkEligibilityCertificate_certificateNumber_key`(`certificateNumber`),
    UNIQUE INDEX `MilkEligibilityCertificate_verificationId_key`(`verificationId`),
    UNIQUE INDEX `MilkEligibilityCertificate_eligibilityCheckId_key`(`eligibilityCheckId`),
    UNIQUE INDEX `MilkEligibilityCertificate_supersededById_key`(`supersededById`),
    INDEX `MilkEligibilityCertificate_animalId_status_issuedAt_idx`(`animalId`, `status`, `issuedAt`),
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
    `chainId` VARCHAR(80) NOT NULL,
    `contractAddress` VARCHAR(100) NOT NULL,
    `transactionHash` VARCHAR(100) NULL,
    `blockNumber` BIGINT NULL,
    `status` ENUM('PENDING', 'ANCHORED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `anchoredAt` DATETIME(3) NULL,
    `lastErrorCode` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlockchainAnchor_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `BlockchainAnchor_recordType_recordId_contentHash_chainId_key`(`recordType`, `recordId`, `contentHash`, `chainId`),
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
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinarianProfile` ADD CONSTRAINT `VeterinarianProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VeterinarianServiceArea` ADD CONSTRAINT `VeterinarianServiceArea_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_requestedVeterinarianId_fkey` FOREIGN KEY (`requestedVeterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `Drug` ADD CONSTRAINT `Drug_antimicrobialClassId_fkey` FOREIGN KEY (`antimicrobialClassId`) REFERENCES `AntimicrobialClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DrugSpecies` ADD CONSTRAINT `DrugSpecies_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DrugSpecies` ADD CONSTRAINT `DrugSpecies_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DrugProduct` ADD CONSTRAINT `DrugProduct_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `Prescription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_drugProductId_fkey` FOREIGN KEY (`drugProductId`) REFERENCES `DrugProduct`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `VeterinaryCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `Prescription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_drugProductId_fkey` FOREIGN KEY (`drugProductId`) REFERENCES `DrugProduct`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRule` ADD CONSTRAINT `WithdrawalRule_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRule` ADD CONSTRAINT `WithdrawalRule_drugProductId_fkey` FOREIGN KEY (`drugProductId`) REFERENCES `DrugProduct`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRule` ADD CONSTRAINT `WithdrawalRule_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRule` ADD CONSTRAINT `WithdrawalRule_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `RegulatorySource`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MrlReferenceRule` ADD CONSTRAINT `MrlReferenceRule_drugId_fkey` FOREIGN KEY (`drugId`) REFERENCES `Drug`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MrlReferenceRule` ADD CONSTRAINT `MrlReferenceRule_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MrlReferenceRule` ADD CONSTRAINT `MrlReferenceRule_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `RegulatorySource`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCheck` ADD CONSTRAINT `MilkEligibilityCheck_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EligibilityTreatmentEvaluation` ADD CONSTRAINT `EligibilityTreatmentEvaluation_withdrawalRuleId_fkey` FOREIGN KEY (`withdrawalRuleId`) REFERENCES `WithdrawalRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_eligibilityCheckId_fkey` FOREIGN KEY (`eligibilityCheckId`) REFERENCES `MilkEligibilityCheck`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilkEligibilityCertificate` ADD CONSTRAINT `MilkEligibilityCertificate_supersededById_fkey` FOREIGN KEY (`supersededById`) REFERENCES `MilkEligibilityCertificate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
