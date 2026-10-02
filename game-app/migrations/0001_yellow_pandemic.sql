CREATE INDEX `idx_player_rewards_owner_at` ON `player_rewards` (`owner_id`,`at`);--> statement-breakpoint
CREATE INDEX `idx_player_runs_owner_updated` ON `player_runs` (`owner_id`,`updated_at`);