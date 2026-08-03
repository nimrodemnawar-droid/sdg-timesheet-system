CREATE TABLE `manualApprovalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('check_in','check_out') NOT NULL,
	`gpsAccuracy` decimal(10,2),
	`latitude` decimal(11,8),
	`longitude` decimal(11,8),
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvalReason` text,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manualApprovalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `manualApprovalRequests` ADD CONSTRAINT `manualApprovalRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `manualApprovalRequests` ADD CONSTRAINT `manualApprovalRequests_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;