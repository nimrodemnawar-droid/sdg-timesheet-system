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
CONSTRAINT `notificationHistory_id` PRIMARY KEY(`id`),
CONSTRAINT `notificationHistory_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade
);
