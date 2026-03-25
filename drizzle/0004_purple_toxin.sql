CREATE TABLE `notificationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`eventType` enum('CHECK_IN','CHECK_OUT','LEAVE_APPROVAL','OVERTIME_ALERT','SYSTEM') NOT NULL,
	`eventEntityId` int,
	`deliveryStatus` enum('PENDING','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
	`channels` json NOT NULL,
	`deliveryDetails` json NOT NULL DEFAULT ('{}'),
	`readAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enableCheckInNotifications` boolean NOT NULL DEFAULT true,
	`enableCheckOutNotifications` boolean NOT NULL DEFAULT true,
	`enableLeaveApprovalNotifications` boolean NOT NULL DEFAULT true,
	`enableOvertimeAlerts` boolean NOT NULL DEFAULT true,
	`quietHoursEnabled` boolean NOT NULL DEFAULT false,
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`quietHoursTimezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`notificationChannels` json NOT NULL DEFAULT ('{"inApp":true,"email":false,"push":false}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leaveBalance` MODIFY COLUMN `usedDays` decimal(5,2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `leaveBalance` ADD `remainingDays` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationHistory` ADD CONSTRAINT `notificationHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD CONSTRAINT `notificationPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leaveBalance` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `leaveBalance` DROP COLUMN `updatedAt`;