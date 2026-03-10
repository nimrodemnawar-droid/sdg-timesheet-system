CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checkInTime` timestamp NOT NULL,
	`checkOutTime` timestamp,
	`checkInLat` decimal(11,8) NOT NULL,
	`checkInLng` decimal(11,8) NOT NULL,
	`checkOutLat` decimal(11,8),
	`checkOutLng` decimal(11,8),
	`checkInAccuracy` decimal(6,2),
	`checkOutAccuracy` decimal(6,2),
	`distanceTraveled` decimal(10,3),
	`durationMinutes` int,
	`overtimeMinutes` int,
	`isSubmitted` boolean NOT NULL DEFAULT false,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentType` enum('profile_photo','csv_report','leave_document','other') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSizeBytes` int,
	`encryptionAlgorithm` varchar(50) NOT NULL DEFAULT 'AES-256',
	`uploadedBy` int NOT NULL,
	`relatedEntityType` varchar(100),
	`relatedEntityId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`notificationType` enum('leave_approved','leave_rejected','overtime_alert','timesheet_reminder','leave_balance_update') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveBalance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('annual','sick','unpaid','maternity','other') NOT NULL,
	`year` int NOT NULL,
	`allocatedDays` decimal(5,2) NOT NULL,
	`usedDays` decimal(5,2) NOT NULL DEFAULT 0,
	`remainingDays` decimal(5,2) NOT NULL,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveBalance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('annual','sick','unpaid','maternity','other') NOT NULL,
	`startDate` datetime NOT NULL,
	`endDate` datetime NOT NULL,
	`daysRequested` decimal(5,2) NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvalReason` text,
	`approvedAt` timestamp,
	`supportingDocumentUrl` text,
	`supportingDocumentKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supervisorRemarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`supervisorId` int NOT NULL,
	`userId` int NOT NULL,
	`encryptedRemark` text NOT NULL,
	`encryptionIv` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supervisorRemarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(255) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemConfig_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `waypoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`userId` int NOT NULL,
	`latitude` decimal(11,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` decimal(6,2),
	`timestamp` timestamp NOT NULL,
	`cumulativeDistance` decimal(10,3),
	`altitude` decimal(8,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waypoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('staff','supervisor','admin') NOT NULL DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhotoKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);