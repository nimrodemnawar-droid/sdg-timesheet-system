-- Repair production drift for documents without deleting legacy metadata.
-- The application schema requires fileSize, isEncrypted, and a flexible documentType.
ALTER TABLE `documents`
  MODIFY COLUMN `documentType` varchar(50) NOT NULL,
  ADD COLUMN `fileSize` int NULL,
  ADD COLUMN `isEncrypted` boolean NOT NULL DEFAULT true;

UPDATE `documents`
SET `fileSize` = `fileSizeBytes`
WHERE `fileSize` IS NULL AND `fileSizeBytes` IS NOT NULL;

-- Legacy columns such as fileUrl, encryptionAlgorithm, uploadedBy,
-- relatedEntityType, relatedEntityId, and expiresAt are intentionally retained
-- to avoid losing historical metadata. They are not selected by the application schema.
