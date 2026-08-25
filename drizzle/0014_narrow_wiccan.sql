CREATE TABLE `leaveTypeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leaveType` enum('annual','sick','unpaid','maternity','other') NOT NULL,
	`label` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveTypeSettings_id` PRIMARY KEY(`id`)
);
