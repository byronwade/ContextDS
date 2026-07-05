CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`prefix` text NOT NULL,
	`permissions` text,
	`last_used` integer,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `css_content` (
	`sha` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`content_compressed` integer DEFAULT true NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`compressed_bytes` integer DEFAULT 0 NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL,
	`ttl_days` integer DEFAULT 30 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_accessed` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `css_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`url` text,
	`kind` text NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`sha` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sha`) REFERENCES `css_content`(`sha`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `layout_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text,
	`scan_id` text,
	`profile_json` text NOT NULL,
	`archetypes` text,
	`containers` text,
	`grid_flex` text,
	`spacing_scale` text,
	`radii_taxonomy` text,
	`shadows_taxonomy` text,
	`motion` text,
	`accessibility` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcp_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`api_key_id` text,
	`tool` text NOT NULL,
	`parameters` text,
	`response_size` integer,
	`latency` integer,
	`success` integer NOT NULL,
	`error_type` text,
	`rate_limited` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `org_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`docs_urls` text,
	`storybook_url` text,
	`figma_url` text,
	`github_org` text,
	`repos_json` text,
	`last_checked` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`url` text NOT NULL,
	`viewport` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`screenshot_url` text,
	`html_size` integer,
	`load_time` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `popular_sites_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`domain` text NOT NULL,
	`popularity` integer DEFAULT 0 NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`last_scanned` integer,
	`rank` integer NOT NULL,
	`cache_date` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recent_activity_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`scan_id` text NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`scanned_at` integer NOT NULL,
	`rank` integer NOT NULL,
	`cache_date` integer NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `remixes` (
	`id` text PRIMARY KEY NOT NULL,
	`source_token_set_ids` text NOT NULL,
	`constraints_json` text,
	`output_token_set_id` text,
	`name` text,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`output_token_set_id`) REFERENCES `token_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`method` text DEFAULT 'computed' NOT NULL,
	`css_source_count` integer DEFAULT 0 NOT NULL,
	`sha` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`error` text,
	`prettify` integer DEFAULT false NOT NULL,
	`metrics_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scans_site_id_idx` ON `scans` (`site_id`);--> statement-breakpoint
CREATE TABLE `screenshot_content` (
	`sha` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`file_size` integer NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL,
	`ttl_days` integer DEFAULT 90 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_accessed` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`scan_id` text NOT NULL,
	`sha` text NOT NULL,
	`viewport` text NOT NULL,
	`captured_at` integer NOT NULL,
	`selector` text,
	`label` text,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sha`) REFERENCES `screenshot_content`(`sha`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screenshots_site_viewport_unique` ON `screenshots` (`site_id`,`viewport`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`robots_status` text DEFAULT 'unknown' NOT NULL,
	`owner_optout` integer DEFAULT false NOT NULL,
	`first_seen` integer NOT NULL,
	`last_scanned` integer,
	`popularity` integer DEFAULT 0 NOT NULL,
	`favicon` text,
	`title` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_domain_unique` ON `sites` (`domain`);--> statement-breakpoint
CREATE INDEX `sites_domain_idx` ON `sites` (`domain`);--> statement-breakpoint
CREATE INDEX `sites_status_idx` ON `sites` (`status`);--> statement-breakpoint
CREATE TABLE `stats_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stats_cache_key_unique` ON `stats_cache` (`key`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`submitted_by` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`reason` text,
	`estimated_queue` integer,
	`notify_email` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`scans_quota` integer DEFAULT 3 NOT NULL,
	`remixes_quota` integer DEFAULT 0 NOT NULL,
	`private_packs_quota` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `token_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`token_path` text NOT NULL,
	`change_type` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`category` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `token_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `token_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text,
	`scan_id` text,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`version_number` integer DEFAULT 1 NOT NULL,
	`tokens_json` text NOT NULL,
	`pack_json` text,
	`consensus_score` real DEFAULT 0,
	`is_public` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `token_sets_site_id_idx` ON `token_sets` (`site_id`);--> statement-breakpoint
CREATE TABLE `token_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`token_set_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`previous_version_id` text,
	`changelog_json` text,
	`diff_summary` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`token_set_id`) REFERENCES `token_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `token_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`token_set_id` text NOT NULL,
	`token_key` text NOT NULL,
	`vote_type` text NOT NULL,
	`note` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`token_set_id`) REFERENCES `token_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);