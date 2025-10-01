-- Create cache tables for performance optimization
-- Migration: 20241001_cache_tables

-- Stats cache table for frequently accessed statistics
CREATE TABLE IF NOT EXISTS "stats_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(100) NOT NULL UNIQUE,
  "data" jsonb NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Popular sites cache table for homepage display
CREATE TABLE IF NOT EXISTS "popular_sites_cache" (
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
CREATE TABLE IF NOT EXISTS "recent_activity_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "domain" varchar(255) NOT NULL,
  "scan_id" uuid NOT NULL,
  "tokens" integer DEFAULT 0 NOT NULL,
  "scanned_at" timestamp NOT NULL,
  "rank" integer NOT NULL,
  "cache_date" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "recent_activity_cache_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE cascade
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stats_cache' AND column_name='key') THEN
    ALTER TABLE "stats_cache" ADD COLUMN "key" varchar(100) NOT NULL DEFAULT 'default';
    ALTER TABLE "stats_cache" ADD CONSTRAINT "stats_cache_key_unique" UNIQUE ("key");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stats_cache' AND column_name='expires_at') THEN
    ALTER TABLE "stats_cache" ADD COLUMN "expires_at" timestamp NOT NULL DEFAULT (now() + interval '1 hour');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_sites_cache' AND column_name='rank') THEN
    ALTER TABLE "popular_sites_cache" ADD COLUMN "rank" integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_sites_cache' AND column_name='cache_date') THEN
    ALTER TABLE "popular_sites_cache" ADD COLUMN "cache_date" timestamp DEFAULT now() NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recent_activity_cache' AND column_name='rank') THEN
    ALTER TABLE "recent_activity_cache" ADD COLUMN "rank" integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recent_activity_cache' AND column_name='scanned_at') THEN
    ALTER TABLE "recent_activity_cache" ADD COLUMN "scanned_at" timestamp NOT NULL DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "stats_cache_key_idx" ON "stats_cache" ("key");
CREATE INDEX IF NOT EXISTS "stats_cache_expires_at_idx" ON "stats_cache" ("expires_at");
CREATE INDEX IF NOT EXISTS "popular_sites_cache_rank_idx" ON "popular_sites_cache" ("rank");
CREATE INDEX IF NOT EXISTS "popular_sites_cache_cache_date_idx" ON "popular_sites_cache" ("cache_date");
CREATE INDEX IF NOT EXISTS "recent_activity_cache_rank_idx" ON "recent_activity_cache" ("rank");
CREATE INDEX IF NOT EXISTS "recent_activity_cache_scanned_at_idx" ON "recent_activity_cache" ("scanned_at");