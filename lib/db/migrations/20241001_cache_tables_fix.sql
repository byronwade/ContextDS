-- Drop existing cache tables and recreate with correct structure
-- Migration: 20241001_cache_tables_fix

-- Drop existing tables if they exist
DROP TABLE IF EXISTS "stats_cache" CASCADE;
DROP TABLE IF EXISTS "popular_sites_cache" CASCADE;
DROP TABLE IF EXISTS "recent_activity_cache" CASCADE;

-- Stats cache table for frequently accessed statistics
CREATE TABLE "stats_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(100) NOT NULL UNIQUE,
  "data" jsonb NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Popular sites cache table for homepage display
CREATE TABLE "popular_sites_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_id" uuid NOT NULL,
  "domain" varchar(255) NOT NULL,
  "popularity" integer DEFAULT 0 NOT NULL,
  "tokens" integer DEFAULT 0 NOT NULL,
  "last_scanned" timestamp,
  "rank" integer NOT NULL,
  "cache_date" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "popular_sites_cache_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade
);

-- Recent activity cache table for activity feeds
CREATE TABLE "recent_activity_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "domain" varchar(255) NOT NULL,
  "scan_id" uuid NOT NULL,
  "tokens" integer DEFAULT 0 NOT NULL,
  "scanned_at" timestamp NOT NULL,
  "rank" integer NOT NULL,
  "cache_date" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "recent_activity_cache_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE cascade
);

-- Create indexes for performance
CREATE INDEX "stats_cache_key_idx" ON "stats_cache" ("key");
CREATE INDEX "stats_cache_expires_at_idx" ON "stats_cache" ("expires_at");
CREATE INDEX "popular_sites_cache_rank_idx" ON "popular_sites_cache" ("rank");
CREATE INDEX "popular_sites_cache_cache_date_idx" ON "popular_sites_cache" ("cache_date");
CREATE INDEX "recent_activity_cache_rank_idx" ON "recent_activity_cache" ("rank");
CREATE INDEX "recent_activity_cache_scanned_at_idx" ON "recent_activity_cache" ("scanned_at");