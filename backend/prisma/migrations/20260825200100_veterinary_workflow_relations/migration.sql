ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_caseMessageId_fkey` FOREIGN KEY (`caseMessageId`) REFERENCES `CaseMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TreatmentRequest` ADD CONSTRAINT `TreatmentRequest_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_diagnosisId_fkey` FOREIGN KEY (`diagnosisId`) REFERENCES `Diagnosis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_veterinarianId_fkey` FOREIGN KEY (`veterinarianId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `PrescriptionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
