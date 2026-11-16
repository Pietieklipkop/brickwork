CREATE TABLE `company_member` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`can_manage_categories` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_member_unique_idx` ON `company_member` (`company_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `company_member_user_idx` ON `company_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `company_member_company_idx` ON `company_member` (`company_id`);--> statement-breakpoint
ALTER TABLE `expense` ADD COLUMN `is_reimbursable` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `expense` ADD COLUMN `reimbursable_company_id` text REFERENCES `company`(`id`) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `idx_expense_reimbursable` ON `expense` (`is_reimbursable`,`reimbursable_company_id`);
