-- Create a materialized stats table for instant loading
CREATE TABLE IF NOT EXISTS stats_cache (
  id SERIAL PRIMARY KEY,
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert initial row
INSERT INTO stats_cache (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Create indexes for fast lookups on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_scans_finished_at ON scans(finished_at DESC) WHERE finished_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_popularity ON sites(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_token_sets_public ON token_sets(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_token_sets_site_id ON token_sets(site_id);
CREATE INDEX IF NOT EXISTS idx_token_sets_scan_id ON token_sets(scan_id);

-- Function to update stats cache (runs in background)
CREATE OR REPLACE FUNCTION refresh_stats_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the single stats row with aggregated data
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
  WHERE id = 1;
END;
$$;

-- Trigger to update stats when scans complete
CREATE OR REPLACE FUNCTION update_stats_on_scan_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if scan actually completed
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    PERFORM refresh_stats_cache();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stats_on_scan ON scans;
CREATE TRIGGER trigger_update_stats_on_scan
AFTER UPDATE ON scans
FOR EACH ROW
EXECUTE FUNCTION update_stats_on_scan_complete();

-- Trigger to update stats when token sets are created
CREATE OR REPLACE FUNCTION update_stats_on_token_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_stats_cache();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stats_on_token_insert ON token_sets;
CREATE TRIGGER trigger_update_stats_on_token_insert
AFTER INSERT ON token_sets
FOR EACH ROW
EXECUTE FUNCTION update_stats_on_token_insert();

-- Initial refresh
SELECT refresh_stats_cache();