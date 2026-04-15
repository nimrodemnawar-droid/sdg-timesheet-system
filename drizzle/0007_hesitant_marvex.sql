DROP TABLE `workplaces`;--> statement-breakpoint
ALTER TABLE `users` ADD `staffNumber` int;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_staffNumber_unique` UNIQUE(`staffNumber`);