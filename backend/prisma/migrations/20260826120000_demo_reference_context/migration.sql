ALTER TABLE `Farm`
  ADD COLUMN `regulatoryJurisdiction` VARCHAR(64) NOT NULL DEFAULT 'INDIA',
  ADD COLUMN `demonstrationMode` BOOLEAN NOT NULL DEFAULT false;
