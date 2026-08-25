ALTER TABLE `leaveRequests` ADD `encryptedApprovalReason` text;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD `approvalReasonIv` varchar(32);