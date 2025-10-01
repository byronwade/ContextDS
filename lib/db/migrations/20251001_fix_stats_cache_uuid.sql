-- Fix stats_cache table to use UUID instead of SERIAL (to match schema.ts)
-- This addresses the "operator does not exist: uuid = integer" error

-- Drop triggers first to avoid conflicts during migration
DROP TRIGGER IF EXISTS trigger_update_stats_on_scan ON scans;
DROP TRIGGER IF EXISTS trigger_update_stats_on_token_insert ON token_sets;

-- Backup existing data
CREATE TEMPORARY TABLE stats_cache_backup AS SELECT * FROM stats_cache;

-- Drop the existing table
DROP TABLE stats_cache;

-- Recreate with correct UUID type (matching schema.ts)
CREATE TABLE stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE,
  data JSONB,
  expires_at TIMESTAMP,
  total_sites INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_scans INTEGER NOT NULL DEFAULT 0,
  total_token_sets INTEGER NOT NULL DEFAULT 0,
  color_count INTEGER NOT NULL DEFAULT 0,
  typography_count INTEGER NOT NULL DEFAULT 0,
  spacing_count INTEGER NOT NULL DEFAULT 0,
  shadow_count INTEGER NOT NULL DEFAULT 0,
  radius_count INTEGER NOT NULL DEFAULT 0,
  motion_count INTEGER NOT NULL DEFAULT 0,
  average_confidence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert a single default row with a known UUID for consistent reference
INSERT INTO stats_cache (
  id,
  total_sites,
  total_tokens,
  total_scans,
  total_token_sets,
  color_count,
  typography_count,
  spacing_count,
  shadow_count,
  radius_count,
  motion_count,
  average_confidence
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  COALESCE((SELECT total_sites FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT total_tokens FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT total_scans FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT total_token_sets FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT color_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT typography_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT spacing_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT shadow_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT radius_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT motion_count FROM stats_cache_backup LIMIT 1), 0),
  COALESCE((SELECT average_confidence FROM stats_cache_backup LIMIT 1), 0)
);

-- Update the refresh function to use the known UUID
CREATE OR REPLACE FUNCTION refresh_stats_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the single stats row with aggregated data using known UUID
  UPDATE stats_cache
  SET
    total_sites = (SELECT COUNT(*) FROM sites),
    total_scans = (SELECT COUNT(*) FROM scans),
    total_token_sets = (SELECT COUNT(*) FROM token_sets),

    -- Token counts by category (optimized using jsonb_object_keys)
    color_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'color', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),
    typography_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'typography', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),
    spacing_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'dimension', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),
    shadow_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'shadow', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),
    radius_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'radius', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),
    motion_count = (
      SELECT COALESCE(SUM((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'motion', '{}'::jsonb)))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),

    -- Total tokens
    total_tokens = (
      SELECT COALESCE(
        SUM(
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'color', '{}'::jsonb))) +
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'typography', '{}'::jsonb))) +
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'dimension', '{}'::jsonb))) +
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'shadow', '{}'::jsonb))) +
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'radius', '{}'::jsonb))) +
          (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(tokens_json->'motion', '{}'::jsonb)))
        ), 0
      )::INTEGER
      FROM token_sets WHERE is_public = true
    ),

    -- Average confidence
    average_confidence = (
      SELECT COALESCE(ROUND(AVG(CAST(consensus_score AS NUMERIC))), 0)::INTEGER
      FROM token_sets WHERE is_public = true
    ),

    updated_at = NOW()
  WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_update_stats_on_scan
AFTER UPDATE ON scans
FOR EACH ROW
EXECUTE FUNCTION update_stats_on_scan_complete();

CREATE TRIGGER trigger_update_stats_on_token_insert
AFTER INSERT ON token_sets
FOR EACH ROW
EXECUTE FUNCTION update_stats_on_token_insert();

-- Initial refresh with the new structure
SELECT refresh_stats_cache();

-- Clean up temporary table
DROP TABLE stats_cache_backup;