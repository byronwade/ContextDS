-- Safe migration to separate CSS content from css_sources
-- This migrates existing CSS data to the new css_content table

BEGIN;

-- Step 1: Create css_content table if it doesn't exist
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

-- Step 2: Migrate existing CSS content from css_sources to css_content
-- Only insert rows that don't already exist (idempotent)
INSERT INTO css_content (sha, content, content_compressed, bytes, compressed_bytes, reference_count, ttl_days, first_seen, last_accessed)
SELECT DISTINCT ON (sha)
    sha,
    COALESCE(content, ''),  -- Use empty string if content is NULL
    COALESCE(content_compressed, true),
    bytes,
    bytes as compressed_bytes,  -- Initially same as bytes
    1 as reference_count,  -- Will be updated by count
    COALESCE(ttl_days, 30),
    NOW() as first_seen,
    NOW() as last_accessed
FROM css_sources
WHERE sha IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM css_content WHERE css_content.sha = css_sources.sha
  )
ON CONFLICT (sha) DO NOTHING;

-- Step 3: Update reference counts based on actual usage
UPDATE css_content cc
SET reference_count = (
    SELECT COUNT(*)
    FROM css_sources cs
    WHERE cs.sha = cc.sha
);

-- Step 4: Now it's safe to add the foreign key constraint
DO $$ BEGIN
    ALTER TABLE "css_sources" ADD CONSTRAINT "css_sources_sha_css_content_sha_fk"
    FOREIGN KEY ("sha") REFERENCES "public"."css_content"("sha")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Drop the columns from css_sources (data is now in css_content)
ALTER TABLE css_sources DROP COLUMN IF EXISTS content;
ALTER TABLE css_sources DROP COLUMN IF EXISTS content_compressed;
ALTER TABLE css_sources DROP COLUMN IF EXISTS ttl_days;

-- Step 6: Add unique constraint to screenshots
DO $$ BEGIN
    -- First try to add the constraint
    ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_site_viewport_unique"
    UNIQUE("site_id","viewport");
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint screenshots_site_viewport_unique already exists';
    WHEN unique_violation THEN
        -- If there are duplicates, we need to clean them up
        RAISE NOTICE 'Found duplicate screenshots, cleaning up...';

        -- Keep only the most recent screenshot for each site+viewport combination
        DELETE FROM screenshots
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                    ROW_NUMBER() OVER (
                        PARTITION BY site_id, viewport
                        ORDER BY captured_at DESC
                    ) as rn
                FROM screenshots
            ) t
            WHERE rn > 1
        );

        -- Now add the constraint
        ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_site_viewport_unique"
        UNIQUE("site_id","viewport");
END $$;

COMMIT;

-- Verify the migration
SELECT
    'css_content' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('css_content')) as total_size
FROM css_content
UNION ALL
SELECT
    'css_sources' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('css_sources')) as total_size
FROM css_sources;
