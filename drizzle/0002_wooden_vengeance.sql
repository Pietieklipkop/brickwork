CREATE TABLE IF NOT EXISTS `ocr_accuracy_log` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`fields_changed_count` integer NOT NULL,
	`vendor_extracted` text,
	`vendor_final` text NOT NULL,
	`vendor_changed` integer NOT NULL,
	`amount_extracted_cents` integer,
	`amount_final_cents` integer NOT NULL,
	`amount_changed` integer NOT NULL,
	`date_extracted` text,
	`date_final` text NOT NULL,
	`date_changed` integer NOT NULL,
	`category_extracted_id` text,
	`category_final_id` text NOT NULL,
	`category_changed` integer NOT NULL,
	`raw_ocr_payload` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ocr_accuracy_company` ON `ocr_accuracy_log` (`company_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ocr_accuracy_status` ON `ocr_accuracy_log` (`status`);--> statement-breakpoint
ALTER TABLE `expense` ADD `ocr_image_key` text;--> statement-breakpoint
ALTER TABLE `payment_account` ADD `card_number` text;
