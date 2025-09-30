-- Migration: Add CSS compression and TTL support
-- Created: 2025-01-XX

-- Add compression flag and TTL to css_sources
ALTER TABLE css_sources
ADD COLUMN content_compressed BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN ttl_days INTEGER NOT NULL DEFAULT 30;

-- Add index for TTL cleanup queries (finds old CSS to delete)
CREATE INDEX idx_css_sources_cleanup ON css_sources(created_at, content_compressed)
WHERE content IS NOT NULL;

-- Add comment explaining compression
COMMENT ON COLUMN css_sources.content IS 'Raw CSS content stored as gzip compressed base64 string';
COMMENT ON COLUMN css_sources.content_compressed IS 'Whether content field is gzip compressed (true by default)';
COMMENT ON COLUMN css_sources.ttl_days IS 'Delete CSS content after N days to save storage (tokens kept forever)';