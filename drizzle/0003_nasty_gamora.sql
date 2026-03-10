CREATE TABLE `activityCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `activityCategories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `activityHeatmap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` datetime NOT NULL,
	`latitude` decimal(11,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`intensity` int,
	`activityCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityHeatmap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sdgGoalId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`targetValue` decimal(10,2),
	`unit` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sdgGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) NOT NULL,
	`icon` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sdgGoals_id` PRIMARY KEY(`id`),
	CONSTRAINT `sdgGoals_goalNumber_unique` UNIQUE(`goalNumber`)
);
--> statement-breakpoint
CREATE TABLE `supervisorConfirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`staffUserId` int NOT NULL,
	`supervisorUserId` int NOT NULL,
	`supervisorName` varchar(255) NOT NULL,
	`supervisorPhone` varchar(20) NOT NULL,
	`digitalSignature` text,
	`privateRemarks` text,
	`remarksIv` varchar(32),
	`confirmedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supervisorConfirmations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditLog` MODIFY COLUMN `action` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `auditLog` MODIFY COLUMN `entityType` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `documentType` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotifications` MODIFY COLUMN `sentAt` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `leaveBalance` MODIFY COLUMN `usedDays` decimal(5,2) NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `systemConfig` MODIFY COLUMN `configKey` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` ADD `amStartTime` datetime;--> statement-breakpoint
ALTER TABLE `attendance` ADD `amEndTime` datetime;--> statement-breakpoint
ALTER TABLE `attendance` ADD `pmStartTime` datetime;--> statement-breakpoint
ALTER TABLE `attendance` ADD `pmEndTime` datetime;--> statement-breakpoint
ALTER TABLE `attendance` ADD `workModality` enum('nairobi_office','homa_bay_office','field','remote');--> statement-breakpoint
ALTER TABLE `attendance` ADD `activityCategoryId` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `sdgGoalId` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `program` varchar(255);--> statement-breakpoint
ALTER TABLE `attendance` ADD `kpiId` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `taskDescription` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `evidenceUploadKey` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `staffRemarks` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `isApproved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `auditLog` ADD `details` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `fileSize` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `isEncrypted` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotifications` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotifications` ADD `type` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotifications` ADD `content` text;--> statement-breakpoint
ALTER TABLE `leaveBalance` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `leaveBalance` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `auditLog` DROP COLUMN `changes`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `fileUrl`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `fileSizeBytes`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `encryptionAlgorithm`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `uploadedBy`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `relatedEntityType`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `relatedEntityId`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `expiresAt`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `recipientId`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `recipientEmail`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `notificationType`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `body`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `emailNotifications` DROP COLUMN `failureReason`;--> statement-breakpoint
ALTER TABLE `leaveBalance` DROP COLUMN `remainingDays`;--> statement-breakpoint
ALTER TABLE `leaveBalance` DROP COLUMN `lastUpdated`;--> statement-breakpoint
ALTER TABLE `leaveRequests` DROP COLUMN `supportingDocumentUrl`;