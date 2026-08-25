ALTER TABLE `Breed` ADD CONSTRAINT `Breed_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Animal` ADD CONSTRAINT `Animal_breedId_fkey` FOREIGN KEY (`breedId`) REFERENCES `Breed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AnimalProfileEvent` ADD CONSTRAINT `AnimalProfileEvent_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VeterinarianProfile` ADD CONSTRAINT `VeterinarianProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FileObject` ADD CONSTRAINT `FileObject_veterinarianProfileId_fkey` FOREIGN KEY (`veterinarianProfileId`) REFERENCES `VeterinarianProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
