CREATE TABLE `timesheetCountryCoordination` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`attendanceId` int NOT NULL,
	`userId` int NOT NULL,
	`country` varchar(100) NOT NULL,
	`participantsAttended` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheetCountryCoordination_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheetTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`userId` int NOT NULL,
	`taskNumber` int NOT NULL,
	`estimatedDuration` enum('0_1_hour','2_hours','3_hours','4_hours','5_8_hours') NOT NULL,
	`taskDescription` text NOT NULL,
	`challenges` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheetTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `timesheetCountryCoordination` ADD CONSTRAINT `timesheetCountryCoordination_taskId_timesheetTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `timesheetTasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheetCountryCoordination` ADD CONSTRAINT `timesheetCountryCoordination_attendanceId_attendance_id_fk` FOREIGN KEY (`attendanceId`) REFERENCES `attendance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheetCountryCoordination` ADD CONSTRAINT `timesheetCountryCoordination_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD CONSTRAINT `timesheetTasks_attendanceId_attendance_id_fk` FOREIGN KEY (`attendanceId`) REFERENCES `attendance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD CONSTRAINT `timesheetTasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;