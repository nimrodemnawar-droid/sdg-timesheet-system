-- Repair production drift for emailNotifications.
-- The application schema uses userId/type/content; older production rows used recipientId/notificationType/body.
ALTER TABLE `emailNotifications`
  ADD COLUMN `userId` int NULL AFTER `id`,
  ADD COLUMN `type` varchar(50) NULL AFTER `userId`,
  ADD COLUMN `content` text NULL AFTER `subject`;

UPDATE `emailNotifications`
SET
  `userId` = `recipientId`,
  `type` = `notificationType`,
  `content` = `body`,
  `sentAt` = COALESCE(`sentAt`, `createdAt`);

ALTER TABLE `emailNotifications`
  MODIFY COLUMN `userId` int NOT NULL,
  MODIFY COLUMN `type` varchar(50) NOT NULL,
  MODIFY COLUMN `sentAt` timestamp NOT NULL;

ALTER TABLE `emailNotifications`
  DROP COLUMN `recipientId`,
  DROP COLUMN `recipientEmail`,
  DROP COLUMN `notificationType`,
  DROP COLUMN `body`,
  DROP COLUMN `status`,
  DROP COLUMN `failureReason`;
