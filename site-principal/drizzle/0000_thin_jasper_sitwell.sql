CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_user` ON `bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `bookings_schedule` ON `bookings` (`start_at`,`end_at`,`status`);--> statement-breakpoint
CREATE TABLE `configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER bookings_no_overlap_insert BEFORE INSERT ON bookings
WHEN NEW.status IN ('pendente','confirmado')
BEGIN
 SELECT RAISE(ABORT,'booking_overlap') WHERE EXISTS(SELECT 1 FROM bookings WHERE status IN ('pendente','confirmado') AND start_at<NEW.end_at AND end_at>NEW.start_at);
END;
--> statement-breakpoint
CREATE TRIGGER bookings_no_overlap_update BEFORE UPDATE OF start_at,end_at,status ON bookings
WHEN NEW.status IN ('pendente','confirmado')
BEGIN
 SELECT RAISE(ABORT,'booking_overlap') WHERE EXISTS(SELECT 1 FROM bookings WHERE id<>NEW.id AND status IN ('pendente','confirmado') AND start_at<NEW.end_at AND end_at>NEW.start_at);
END;
