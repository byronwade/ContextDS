CREATE TYPE "public"."change_type" AS ENUM('added', 'removed', 'modified');--> statement-breakpoint
CREATE TYPE "public"."css_source_kind" AS ENUM('link', 'inline', 'computed');--> statement-breakpoint
CREATE TYPE "public"."robots_status" AS ENUM('allowed', 'disallowed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."scan_method" AS ENUM('static', 'computed');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('queued', 'scanning', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('queued', 'scanning', 'done', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('correct', 'alias', 'duplicate', 'low_contrast', 'rename');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"prefix" varchar(10) NOT NULL,
	"permissions" jsonb,
	"last_used" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" uuid,
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "css_content" (
	"sha" varchar(64) PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"content_compressed" boolean DEFAULT true NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"compressed_bytes" integer DEFAULT 0 NOT NULL,
	"reference_count" integer DEFAULT 0 NOT NULL,
	"ttl_days" integer DEFAULT 30 NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "css_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"url" text,
	"kind" "css_source_kind" NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"sha" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "layout_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"scan_id" uuid,
	"profile_json" jsonb NOT NULL,
	"archetypes" jsonb,
	"containers" jsonb,
	"grid_flex" jsonb,
	"spacing_scale" jsonb,
	"radii_taxonomy" jsonb,
	"shadows_taxonomy" jsonb,
	"motion" jsonb,
	"accessibility" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"api_key_id" uuid,
	"tool" varchar(100) NOT NULL,
	"parameters" jsonb,
	"response_size" integer,
	"latency" integer,
	"success" boolean NOT NULL,
	"error_type" varchar(100),
	"rate_limited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"docs_urls" jsonb,
	"storybook_url" text,
	"figma_url" text,
	"github_org" varchar(255),
	"repos_json" jsonb,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"url" text NOT NULL,
	"viewport" varchar(50),
	"status" "scan_status" DEFAULT 'queued' NOT NULL,
	"screenshot_url" text,
	"html_size" integer,
	"load_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remixes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_token_set_ids" jsonb NOT NULL,
	"constraints_json" jsonb,
	"output_token_set_id" uuid,
	"name" varchar(255),
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"method" "scan_method" DEFAULT 'computed' NOT NULL,
	"css_source_count" integer DEFAULT 0 NOT NULL,
	"sha" varchar(64),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"error" text,
	"prettify" boolean DEFAULT false NOT NULL,
	"metrics_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screenshot_content" (
	"sha" varchar(64) PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_size" integer NOT NULL,
	"reference_count" integer DEFAULT 0 NOT NULL,
	"ttl_days" integer DEFAULT 90 NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"sha" varchar(64) NOT NULL,
	"viewport" varchar(50) NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"selector" text,
	"label" varchar(100),
	CONSTRAINT "screenshots_site_viewport_unique" UNIQUE("site_id","viewport")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(255) NOT NULL,
	"status" "scan_status" DEFAULT 'queued' NOT NULL,
	"robots_status" "robots_status" DEFAULT 'unknown' NOT NULL,
	"owner_optout" boolean DEFAULT false NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_scanned" timestamp,
	"popularity" integer DEFAULT 0 NOT NULL,
	"favicon" text,
	"title" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"submitted_by" uuid,
	"status" "submission_status" DEFAULT 'queued' NOT NULL,
	"reason" text,
	"estimated_queue" integer,
	"notify_email" varchar(255),
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"status" varchar(50) NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"scans_quota" integer DEFAULT 3 NOT NULL,
	"remixes_quota" integer DEFAULT 0 NOT NULL,
	"private_packs_quota" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"token_path" varchar(255) NOT NULL,
	"change_type" "change_type" NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"category" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"scan_id" uuid,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"tokens_json" jsonb NOT NULL,
	"pack_json" jsonb,
	"consensus_score" numeric(3, 2) DEFAULT '0.00',
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"token_set_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"previous_version_id" uuid,
	"changelog_json" jsonb,
	"diff_summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_set_id" uuid NOT NULL,
	"token_key" varchar(255) NOT NULL,
	"vote_type" "vote_type" NOT NULL,
	"note" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "css_sources" ADD CONSTRAINT "css_sources_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "css_sources" ADD CONSTRAINT "css_sources_sha_css_content_sha_fk" FOREIGN KEY ("sha") REFERENCES "public"."css_content"("sha") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "layout_profiles" ADD CONSTRAINT "layout_profiles_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "layout_profiles" ADD CONSTRAINT "layout_profiles_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcp_usage" ADD CONSTRAINT "mcp_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcp_usage" ADD CONSTRAINT "mcp_usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_artifacts" ADD CONSTRAINT "org_artifacts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pages" ADD CONSTRAINT "pages_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remixes" ADD CONSTRAINT "remixes_output_token_set_id_token_sets_id_fk" FOREIGN KEY ("output_token_set_id") REFERENCES "public"."token_sets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remixes" ADD CONSTRAINT "remixes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scans" ADD CONSTRAINT "scans_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_sha_screenshot_content_sha_fk" FOREIGN KEY ("sha") REFERENCES "public"."screenshot_content"("sha") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_changes" ADD CONSTRAINT "token_changes_version_id_token_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."token_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_sets" ADD CONSTRAINT "token_sets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_sets" ADD CONSTRAINT "token_sets_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_sets" ADD CONSTRAINT "token_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_versions" ADD CONSTRAINT "token_versions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_versions" ADD CONSTRAINT "token_versions_token_set_id_token_sets_id_fk" FOREIGN KEY ("token_set_id") REFERENCES "public"."token_sets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_versions" ADD CONSTRAINT "token_versions_previous_version_id_token_versions_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."token_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_votes" ADD CONSTRAINT "token_votes_token_set_id_token_sets_id_fk" FOREIGN KEY ("token_set_id") REFERENCES "public"."token_sets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_votes" ADD CONSTRAINT "token_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
