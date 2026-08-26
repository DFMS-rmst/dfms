ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TreatmentAdministration` ADD CONSTRAINT `TreatmentAdministration_administeredById_fkey` FOREIGN KEY (`administeredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
