CREATE TABLE `monthlyReportAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`actionDate` timestamp NOT NULL DEFAULT (now()),
	`reason` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthlyReportAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportingMonth` datetime NOT NULL,
	`submissionStatus` enum('pending','submitted','returned','locked') NOT NULL DEFAULT 'pending',
	`reviewStatus` enum('pending_review','approved','rejected','correction_required') NOT NULL DEFAULT 'pending_review',
	`submittedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`supervisorComments` text,
	`keyActivities` text,
	`challenges` text,
	`solutions` text,
	`plannedActivities` text,
	`supportRequired` text,
	`additionalComments` text,
	`confirmationStatement` boolean NOT NULL DEFAULT false,
	`isDraft` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyReports_id` PRIMARY KEY(`id`)
);
