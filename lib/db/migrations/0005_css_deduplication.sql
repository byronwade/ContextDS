-- Migration: CSS deduplication by SHA hash
-- Created: 2025-01-XX
-- Storage savings: 50-80% for sites using popular frameworks

-- Create css_content table for deduplicated storage
CREATE TABLE IF NOT EXISTS css_content (
  sha VARCHAR(64) PRIMARY KEY,
  content TEXT NOT NULL,
  content_compressed BOOLEAN NOT NULL DEFAULT true,
  bytes INTEGER NOT NULL DEFAULT 0,
  compressed_bytes INTEGER NOT NULL DEFAULT 0,
  reference_count INTEGER NOT NULL DEFAULT 0,
  ttl_days INTEGER NOT NULL DEFAULT 30,
  first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for TTL cleanup queries
CREATE INDEX idx_css_content_cleanup ON css_content(first_seen, reference_count)
WHERE content IS NOT NULL;

-- Add index for reference counting
CREATE INDEX idx_css_content_refs ON css_content(reference_count, last_accessed);

-- Migrate existing CSS content to deduplicated table
-- This will run once during migration
DO $$
DECLARE
  existing_record RECORD;
BEGIN
  -- Insert unique CSS content from existing css_sources
  INSERT INTO css_content (sha, content, content_compressed, bytes, compressed_bytes, reference_count, first_seen)
  SELECT
    sha,
    content,
    content_compressed,
    bytes,
    LENGTH(content) as compressed_bytes,
    COUNT(*) as reference_count,
    MIN(created_at) as first_seen
  FROM css_sources
  WHERE content IS NOT NULL
  GROUP BY sha, content, content_compressed, bytes
  ON CONFLICT (sha) DO NOTHING;

  RAISE NOTICE 'Migrated existing CSS content to deduplicated storage';
END $$;

-- Remove content columns from css_sources (now references css_content)
ALTER TABLE css_sources
DROP COLUMN IF EXISTS content,
DROP COLUMN IF EXISTS content_compressed,
DROP COLUMN IF EXISTS ttl_days;

-- Update foreign key reference (if not already exists)
ALTER TABLE css_sources
DROP CONSTRAINT IF EXISTS css_sources_sha_css_content_sha_fk;

ALTER TABLE css_sources
ADD CONSTRAINT css_sources_sha_css_content_sha_fk
FOREIGN KEY (sha) REFERENCES css_content(sha) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE css_content IS 'Deduplicated CSS storage - multiple sites share same CSS by SHA hash';
COMMENT ON COLUMN css_content.reference_count IS 'Number of css_sources records referencing this content';
COMMENT ON COLUMN css_content.ttl_days IS 'Delete CSS content after N days of last access';
COMMENT ON COLUMN css_sources.sha IS 'References css_content.sha for deduplicated storage';