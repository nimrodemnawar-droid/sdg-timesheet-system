ALTER TABLE `attendance` ADD `organization` enum('icy_africa','africa_for_sdgs','joint');--> statement-breakpoint
ALTER TABLE `attendance` ADD `departmentFunction` varchar(100);--> statement-breakpoint
ALTER TABLE `attendance` ADD `programProject` varchar(255);--> statement-breakpoint
ALTER TABLE `leaveTypeSettings` ADD `defaultAllocatedDays` decimal(6,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `specificActivity` text;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `targetStakeholder` text;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `locationPlatform` enum('physical_location','zoom','whatsapp','email','school','church','other');--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `tangibleOutput` text;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `numbersReached` int;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `outcomeResults` text;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `followUpRequired` enum('yes','no') DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `evidenceType` enum('report','photo','email','registration_list','document','social_media_link','other');--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `evidenceLink` text;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `activityStatus` enum('completed','ongoing','pending') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `onlineMissionary` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `timesheetTasks` ADD `onlineMissionaryParticipants` int;