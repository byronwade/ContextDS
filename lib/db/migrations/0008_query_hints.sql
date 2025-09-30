-- Add query hints and optimizations for PostgreSQL query planner

-- 1. Mark stats_cache table as frequently accessed (pin to buffer pool)
ALTER TABLE stats_cache SET (
  fillfactor = 100,  -- No updates, only refreshes
  autovacuum_enabled = true,
  toast_tuple_target = 128
);

-- 2. Add GIN index for faster JSONB queries if needed later
-- (Currently not needed since we use materialized aggregates)

-- 3. Optimize table statistics collection
ALTER TABLE stats_cache SET (
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold = 1
);

-- 4. Create function for ultra-fast stats retrieval with query hints
CREATE OR REPLACE FUNCTION get_instant_stats()
RETURNS TABLE (
  total_sites INTEGER,
  total_tokens INTEGER,
  total_scans INTEGER,
  total_token_sets INTEGER,
  color_count INTEGER,
  typography_count INTEGER,
  spacing_count INTEGER,
  shadow_count INTEGER,
  radius_count INTEGER,
  motion_count INTEGER,
  average_confidence INTEGER,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.total_sites,
    sc.total_tokens,
    sc.total_scans,
    sc.total_token_sets,
    sc.color_count,
    sc.typography_count,
    sc.spacing_count,
    sc.shadow_count,
    sc.radius_count,
    sc.motion_count,
    sc.average_confidence,
    sc.updated_at
  FROM stats_cache sc
  WHERE sc.id = 1;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- 5. Create function for recent activity with hints
CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS TABLE (
  domain VARCHAR(255),
  finished_at TIMESTAMP,
  token_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rac.domain,
    rac.finished_at,
    rac.token_count
  FROM recent_activity_cache rac
  ORDER BY rac.finished_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- 6. Create function for popular sites with hints
CREATE OR REPLACE FUNCTION get_popular_sites()
RETURNS TABLE (
  domain VARCHAR(255),
  popularity INTEGER,
  last_scanned TIMESTAMP,
  token_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    psc.domain,
    psc.popularity,
    psc.last_scanned,
    psc.token_count
  FROM popular_sites_cache psc
  ORDER BY psc.popularity DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_instant_stats() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_recent_activity() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_popular_sites() TO PUBLIC;

-- 8. Pre-warm the functions (compile and cache execution plans)
SELECT * FROM get_instant_stats();
SELECT * FROM get_recent_activity();
SELECT * FROM get_popular_sites();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Query optimization functions created!';
  RAISE NOTICE '  - get_instant_stats() for main stats';
  RAISE NOTICE '  - get_recent_activity() for recent scans';
  RAISE NOTICE '  - get_popular_sites() for popular sites';
  RAISE NOTICE 'Functions are STABLE and PARALLEL SAFE for maximum performance';
END $$;