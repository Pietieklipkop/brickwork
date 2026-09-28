CREATE TABLE IF NOT EXISTS `ocr_accuracy_log` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text REFERENCES `expense`(`id`) ON DELETE cascade,
	`company_id` text NOT NULL REFERENCES `company`(`id`) ON DELETE cascade,
	`user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
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
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_ocr_accuracy_company` ON `ocr_accuracy_log` (`company_id`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_ocr_accuracy_status` ON `ocr_accuracy_log` (`status`);
