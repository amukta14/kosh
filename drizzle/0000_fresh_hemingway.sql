CREATE TABLE `attendance` (
	`student_id` text NOT NULL,
	`month` text NOT NULL,
	`present` integer NOT NULL,
	`total` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_pk` ON `attendance` (`student_id`,`month`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`detail` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`centre_id` text NOT NULL,
	`name` text NOT NULL,
	`course` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `centres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fee_plans` (
	`student_id` text PRIMARY KEY NOT NULL,
	`gross_fee` integer NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` integer DEFAULT 0 NOT NULL,
	`discount_reason` text,
	`net_fee` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gateway_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`instalment_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instalment_id`) REFERENCES `instalments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `instalments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`seq` integer NOT NULL,
	`due_date` text NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instalments_student_seq` ON `instalments` (`student_id`,`seq`);--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`language` text DEFAULT 'hi' NOT NULL,
	`consent_at` text,
	`consent_version` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parents_phone` ON `parents` (`phone`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`amount` integer NOT NULL,
	`received_on` text NOT NULL,
	`method` text NOT NULL,
	`reference` text NOT NULL,
	`receipt_no` text NOT NULL,
	`gateway_order_id` text,
	`recorded_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_student` ON `payments` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_receipt` ON `payments` (`receipt_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_gateway_order` ON `payments` (`gateway_order_id`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`request_date` text NOT NULL,
	`leave_date` text NOT NULL,
	`material_deduction` integer DEFAULT 0 NOT NULL,
	`refund_amount` integer NOT NULL,
	`calculation` text NOT NULL,
	`policy_version` text NOT NULL,
	`deadline` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`approved_by` text,
	`paid_on` text,
	`payout_reference` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`instalment_id` text NOT NULL,
	`offset_days` integer NOT NULL,
	`status` text NOT NULL,
	`channel` text NOT NULL,
	`language` text NOT NULL,
	`to_phone` text NOT NULL,
	`body` text NOT NULL,
	`balance_at_send` integer NOT NULL,
	`sent_on` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instalment_id`) REFERENCES `instalments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_once` ON `reminders` (`instalment_id`,`offset_days`);--> statement-breakpoint
CREATE INDEX `reminders_student` ON `reminders` (`student_id`);--> statement-breakpoint
CREATE TABLE `risk_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`probability` integer NOT NULL,
	`factors` text NOT NULL,
	`created_on` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `risk_student` ON `risk_flags` (`student_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email` ON `staff` (`email`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`batch_id` text NOT NULL,
	`parent_id` text NOT NULL,
	`enrolled_on` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`withdrawn_on` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `students_batch` ON `students` (`batch_id`);--> statement-breakpoint
CREATE INDEX `students_parent` ON `students` (`parent_id`);--> statement-breakpoint
CREATE TABLE `test_scores` (
	`student_id` text NOT NULL,
	`test_name` text NOT NULL,
	`test_date` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_scores_pk` ON `test_scores` (`student_id`,`test_name`);--> statement-breakpoint
CREATE TABLE `unmatched_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`reference` text NOT NULL,
	`payer_name` text NOT NULL,
	`received_on` text NOT NULL,
	`source` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`matched_payment_id` text,
	`resolved_by` text,
	`resolved_at` text
);
