-- Simple fix for stats_cache UUID type mismatch
-- Drop the existing table that uses SERIAL and recreate with proper UUID

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_stats_on_scan ON scans;
DROP TRIGGER IF EXISTS trigger_update_stats_on_token_insert ON token_sets;

-- Drop the problematic table completely
DROP TABLE IF EXISTS stats_cache;

-- Recreate with proper UUID type matching schema.ts
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

-- Insert a single default row with a known UUID
INSERT INTO stats_cache (id) VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);

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

-- Initial refresh
SELECT refresh_stats_cache();