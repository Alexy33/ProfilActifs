CREATE TABLE `company` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`siren` text NOT NULL,
	`position` text NOT NULL,
	`address` text NOT NULL,
	`postal_code` text NOT NULL,
	`city` text NOT NULL,
	`sector` text NOT NULL,
	`phone` text,
	`website` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_user_id_unique` ON `company` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_siren_unique` ON `company` (`siren`);