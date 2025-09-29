-- ContextDS Database Optimization Script
-- Ultrathink performance optimization for Neon PostgreSQL

-- ============================================================================
-- CRITICAL INDEXES FOR HIGH-PERFORMANCE TOKEN SEARCH
-- ============================================================================

-- Token Sets - Primary search target (most important)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_site_public
ON token_sets(site_id, is_public)
WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_created_at
ON token_sets(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_consensus_score
ON token_sets(consensus_score DESC)
WHERE consensus_score IS NOT NULL;

-- JSONB optimization for token content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_jsonb_gin
ON token_sets USING gin(tokens_json);

-- Enable fast JSONB path queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_jsonb_paths
ON token_sets USING gin(tokens_json jsonb_path_ops);

-- Sites - Fast domain lookup and popularity ranking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_domain_unique
ON sites(domain);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_popularity_active
ON sites(popularity DESC, owner_optout, robots_status)
WHERE owner_optout = false AND robots_status = 'allowed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_last_scanned
ON sites(last_scanned DESC)
WHERE last_scanned IS NOT NULL;

-- ============================================================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- ============================================================================

-- Add search vector columns for ultrafast text search
ALTER TABLE sites ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vectors for existing data
UPDATE sites
SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  domain
)
WHERE search_vector IS NULL;

-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_search_vector
ON sites USING gin(search_vector);

-- Auto-update trigger for search vectors
CREATE OR REPLACE FUNCTION update_sites_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    NEW.domain
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_sites_search_vector_trigger ON sites;
CREATE TRIGGER update_sites_search_vector_trigger
  BEFORE INSERT OR UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_sites_search_vector();

-- ============================================================================
-- SCAN AND LAYOUT OPTIMIZATION
-- ============================================================================

-- Scans - Fast site relationship and status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_site_status
ON scans(site_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_finished_at
ON scans(finished_at DESC)
WHERE finished_at IS NOT NULL;

-- Layout Profiles - Fast site lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_layout_profiles_site_id
ON layout_profiles(site_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_layout_profiles_jsonb_gin
ON layout_profiles USING gin(profile_json);

-- CSS Sources - Fast content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_css_sources_scan_id
ON css_sources(scan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_css_sources_sha
ON css_sources(sha);

-- Enable full-text search on CSS content (for code search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_css_sources_content_gin
ON css_sources USING gin(to_tsvector('english', content))
WHERE content IS NOT NULL;

-- ============================================================================
-- USER AND VOTING SYSTEM OPTIMIZATION
-- ============================================================================

-- Users - Fast email lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON users(email);

-- Token Votes - Fast aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_votes_token_set_key
ON token_votes(token_set_id, token_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_votes_user_id
ON token_votes(user_id);

-- Submissions - Queue processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_status_priority
ON submissions(status, priority DESC, created_at);

-- ============================================================================
-- API AND MONITORING OPTIMIZATION
-- ============================================================================

-- MCP Usage - Performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_usage_created_at
ON mcp_usage(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_usage_tool
ON mcp_usage(tool, success);

-- API Keys - Fast authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_hash
ON api_keys(key_hash)
WHERE is_active = true;

-- Audit Log - Fast log queries with partitioning support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at
ON audit_log(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_action
ON audit_log(user_id, action);

-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Ensure data quality constraints
ALTER TABLE sites ADD CONSTRAINT IF NOT EXISTS check_popularity_range
CHECK (popularity >= 0 AND popularity <= 100);

ALTER TABLE token_sets ADD CONSTRAINT IF NOT EXISTS check_consensus_score_range
CHECK (consensus_score >= 0 AND consensus_score <= 100);

ALTER TABLE css_sources ADD CONSTRAINT IF NOT EXISTS check_bytes_positive
CHECK (bytes >= 0);

-- Ensure required JSONB structure
ALTER TABLE token_sets ADD CONSTRAINT IF NOT EXISTS check_tokens_json_structure
CHECK (tokens_json ? '$schema' OR jsonb_typeof(tokens_json) = 'object');

-- ============================================================================
-- PERFORMANCE STATISTICS AND MONITORING
-- ============================================================================

-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Function to get performance stats
CREATE OR REPLACE FUNCTION get_contextds_performance_stats()
RETURNS TABLE(
  table_name text,
  total_rows bigint,
  table_size text,
  index_size text,
  total_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname||'.'||tablename as table_name,
    n_tup_ins + n_tup_upd as total_rows,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(min_duration interval DEFAULT '100ms')
RETURNS TABLE(
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision,
  stddev_time double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    substr(pss.query, 1, 100) as query,
    pss.calls,
    pss.total_exec_time,
    pss.mean_exec_time,
    pss.stddev_exec_time
  FROM pg_stat_statements pss
  WHERE pss.mean_exec_time > extract(epoch from min_duration) * 1000
  ORDER BY pss.mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VACUUM AND MAINTENANCE OPTIMIZATION
-- ============================================================================

-- Optimize autovacuum for high-write tables
ALTER TABLE scans SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE token_sets SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE mcp_usage SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- CONNECTION AND PERFORMANCE SETTINGS
-- ============================================================================

-- Optimize for connection pooling (these would be set at database level)
-- shared_preload_libraries = 'pg_stat_statements'
-- max_connections = 100
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100

-- ============================================================================
-- UTILITY FUNCTIONS FOR CONTEXTDS
-- ============================================================================

-- Fast token count function
CREATE OR REPLACE FUNCTION count_tokens_in_set(tokens_json jsonb)
RETURNS integer AS $$
BEGIN
  RETURN (
    coalesce(jsonb_object_length(tokens_json->'color'), 0) +
    coalesce(jsonb_object_length(tokens_json->'typography'), 0) +
    coalesce(jsonb_object_length(tokens_json->'dimension'), 0) +
    coalesce(jsonb_object_length(tokens_json->'shadow'), 0) +
    coalesce(jsonb_object_length(tokens_json->'transition'), 0)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fast site summary function
CREATE OR REPLACE FUNCTION get_site_summary(site_domain text)
RETURNS TABLE(
  domain text,
  total_scans bigint,
  latest_scan timestamp,
  total_tokens bigint,
  avg_confidence numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.domain,
    count(sc.id) as total_scans,
    max(sc.finished_at) as latest_scan,
    sum(count_tokens_in_set(ts.tokens_json)) as total_tokens,
    avg(cast(ts.consensus_score as decimal)) as avg_confidence
  FROM sites s
  LEFT JOIN scans sc ON s.id = sc.site_id
  LEFT JOIN token_sets ts ON sc.id = ts.scan_id
  WHERE s.domain = site_domain
  GROUP BY s.domain;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for popular tokens (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_tokens AS
SELECT
  ts.tokens_json->'color' as color_tokens,
  ts.tokens_json->'typography' as typography_tokens,
  ts.tokens_json->'dimension' as spacing_tokens,
  s.domain,
  ts.consensus_score,
  ts.created_at,
  count_tokens_in_set(ts.tokens_json) as token_count
FROM token_sets ts
LEFT JOIN sites s ON ts.site_id = s.id
WHERE ts.is_public = true
ORDER BY ts.consensus_score DESC, ts.created_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_tokens_id
ON popular_tokens(domain, created_at);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_popular_tokens()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW popular_tokens;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND OPTIMIZATION PROCEDURES
-- ============================================================================

-- Clean up old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Clean up failed scans older than 7 days
CREATE OR REPLACE FUNCTION cleanup_failed_scans()
RETURNS void AS $$
BEGIN
  DELETE FROM scans
  WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Update table statistics
CREATE OR REPLACE FUNCTION update_contextds_stats()
RETURNS void AS $$
BEGIN
  ANALYZE sites;
  ANALYZE scans;
  ANALYZE token_sets;
  ANALYZE layout_profiles;
  ANALYZE css_sources;

  -- Refresh materialized view
  PERFORM refresh_popular_tokens();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sites IS 'Website tracking with full-text search optimization';
COMMENT ON TABLE token_sets IS 'W3C design tokens with JSONB search optimization';
COMMENT ON TABLE scans IS 'Scan history with efficient status queries';
COMMENT ON TABLE layout_profiles IS 'Layout DNA analysis with JSONB optimization';
COMMENT ON TABLE css_sources IS 'CSS content with full-text search capability';

COMMENT ON INDEX idx_token_sets_jsonb_gin IS 'JSONB GIN index for ultrafast token content search';
COMMENT ON INDEX idx_sites_search_vector IS 'Full-text search vector for site discovery';
COMMENT ON INDEX idx_token_sets_site_public IS 'Composite index for public token queries';

-- ============================================================================
-- INITIAL STATISTICS UPDATE
-- ============================================================================

-- Update all table statistics after index creation
SELECT update_contextds_stats();

-- Show optimization results
SELECT 'ContextDS database optimization completed!' as status;
SELECT * FROM get_contextds_performance_stats();