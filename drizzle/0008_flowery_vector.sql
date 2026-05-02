CREATE TABLE `reportDeliveryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`reportType` enum('attendance','overtime','leave','gps_activity','all') NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`recipientEmails` json NOT NULL,
	`deliveryStatus` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
	`errorMessage` text,
	`fileUrl` text,
	`fileSize` int,
	`recordCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportDeliveryHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('attendance','overtime','leave','gps_activity','all') NOT NULL,
	`frequency` enum('daily','weekly') NOT NULL,
	`dayOfWeek` varchar(20),
	`timeOfDay` varchar(5) NOT NULL,
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`emailRecipients` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSentAt` timestamp,
	`nextScheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reportDeliveryHistory` ADD CONSTRAINT `reportDeliveryHistory_scheduleId_reportSchedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `reportSchedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportSchedules` ADD CONSTRAINT `reportSchedules_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;