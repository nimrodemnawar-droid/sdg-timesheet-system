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
CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
CONSTRAINT `notificationPreferences_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade
);
