-- Extreme performance optimization for instant stats loading
-- These are experimental but production-safe optimizations

-- 1. BRIN indexes for time-series data (much smaller, faster for sequential data)
DROP INDEX IF EXISTS idx_scans_finished_at;
CREATE INDEX idx_scans_finished_at_brin ON scans USING BRIN (finished_at) WHERE finished_at IS NOT NULL;

-- 2. Partial indexes for hot query paths
CREATE INDEX IF NOT EXISTS idx_token_sets_public_site
  ON token_sets(site_id, is_public)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_token_sets_public_scan
  ON token_sets(scan_id, is_public)
  WHERE is_public = true;

-- 3. Composite index for the join in recent activity
CREATE INDEX IF NOT EXISTS idx_scans_site_finished
  ON scans(site_id, finished_at DESC)
  WHERE finished_at IS NOT NULL;

-- 4. Covering index for popular sites query (includes all needed columns)
CREATE INDEX IF NOT EXISTS idx_sites_popularity_covering
  ON sites(popularity DESC)
  INCLUDE (domain, last_scanned);

-- 5. Pre-aggregated recent activity view (materialized for instant reads)
DROP MATERIALIZED VIEW IF EXISTS recent_activity_cache CASCADE;
CREATE MATERIALIZED VIEW recent_activity_cache AS
SELECT
  s.id,
  sites.domain,
  s.finished_at,
  COUNT(ts.id)::INTEGER as token_count
FROM scans s
LEFT JOIN sites ON s.site_id = sites.id
LEFT JOIN token_sets ts ON ts.scan_id = s.id
WHERE s.finished_at IS NOT NULL
GROUP BY s.id, sites.domain, s.finished_at
ORDER BY s.finished_at DESC
LIMIT 10;

-- Index on the materialized view
CREATE INDEX idx_recent_activity_finished ON recent_activity_cache(finished_at DESC);

-- 6. Pre-aggregated popular sites view
DROP MATERIALIZED VIEW IF EXISTS popular_sites_cache CASCADE;
CREATE MATERIALIZED VIEW popular_sites_cache AS
SELECT
  sites.domain,
  sites.popularity,
  sites.last_scanned,
  COUNT(ts.id)::INTEGER as token_count
FROM sites
LEFT JOIN token_sets ts ON ts.site_id = sites.id
GROUP BY sites.id, sites.domain, sites.popularity, sites.last_scanned
ORDER BY sites.popularity DESC
LIMIT 5;

-- Index on the materialized view
CREATE INDEX idx_popular_sites_popularity ON popular_sites_cache(popularity DESC);

-- 7. Function to refresh materialized views efficiently
CREATE OR REPLACE FUNCTION refresh_activity_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh recent activity (fast, only 10 rows)
  REFRESH MATERIALIZED VIEW CONCURRENTLY recent_activity_cache;

  -- Refresh popular sites (fast, only 5 rows)
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_sites_cache;
END;
$$;

-- 8. Trigger to refresh views when needed (async, non-blocking)
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh in background using pg_notify for async processing
  PERFORM pg_notify('refresh_cache', 'activity_views');
  RETURN NEW;
END;
$$;

-- Only refresh views when scans complete (not on every update)
DROP TRIGGER IF EXISTS trigger_refresh_views_on_scan ON scans;
CREATE TRIGGER trigger_refresh_views_on_scan
AFTER UPDATE ON scans
FOR EACH ROW
WHEN (NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL)
EXECUTE FUNCTION trigger_refresh_views();

-- 9. Vacuum and analyze optimization settings
ALTER TABLE stats_cache SET (
  autovacuum_vacuum_scale_factor = 0.0,
  autovacuum_analyze_scale_factor = 0.0,
  autovacuum_vacuum_threshold = 1,
  autovacuum_analyze_threshold = 1
);

-- 10. Enable parallel query execution for aggregations
ALTER TABLE token_sets SET (parallel_workers = 4);
ALTER TABLE scans SET (parallel_workers = 2);
ALTER TABLE sites SET (parallel_workers = 2);

-- 11. Statistics target increase for better query planning
ALTER TABLE scans ALTER COLUMN finished_at SET STATISTICS 1000;
ALTER TABLE sites ALTER COLUMN popularity SET STATISTICS 1000;
ALTER TABLE token_sets ALTER COLUMN is_public SET STATISTICS 1000;

-- 12. Initial refresh of materialized views
REFRESH MATERIALIZED VIEW recent_activity_cache;
REFRESH MATERIALIZED VIEW popular_sites_cache;

-- 13. Pre-warm the stats cache
SELECT refresh_stats_cache();

-- 14. Analyze tables for optimal query planning
ANALYZE scans;
ANALYZE sites;
ANALYZE token_sets;
ANALYZE stats_cache;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Extreme performance optimizations applied successfully!';
  RAISE NOTICE '  - BRIN indexes for time-series data';
  RAISE NOTICE '  - Partial indexes for filtered queries';
  RAISE NOTICE '  - Covering indexes to avoid table lookups';
  RAISE NOTICE '  - Materialized views for instant reads';
  RAISE NOTICE '  - Parallel query execution enabled';
  RAISE NOTICE '  - Query planner statistics optimized';
END $$;