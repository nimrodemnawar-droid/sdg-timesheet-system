ALTER TABLE `attendance` ADD `dailyStaffNumber` varchar(3);--> statement-breakpoint
ALTER TABLE `attendance` ADD `checkInAddress` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `checkOutAddress` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `hasCheckedInToday` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` ADD `hasCheckedOutToday` boolean DEFAULT false NOT NULL;