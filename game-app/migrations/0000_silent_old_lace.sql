CREATE TABLE `crystal_ledger` (
	`owner_id` text NOT NULL,
	`run_id` text NOT NULL,
	`source` text NOT NULL,
	`amount` integer NOT NULL,
	`label` text NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `run_id`, `source`)
);
--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`reward_id` text NOT NULL,
	`title` text NOT NULL,
	`cost` integer NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state_json` text NOT NULL,
	`journal_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL
);
