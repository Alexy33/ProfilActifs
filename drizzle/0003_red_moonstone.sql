ALTER TABLE `profile` ADD `video_consent_granted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_consent_at` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_consent_version` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_consent_revoked_at` integer;