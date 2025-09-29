-- ContextDS Performance Optimization Indexes
-- Critical indexes for production performance

-- Token search performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_tokens_gin
ON token_sets USING GIN (tokens_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_public_consensus
ON token_sets (is_public, consensus_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_sets_site_public
ON token_sets (site_id, is_public, consensus_score DESC);

-- Site performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_domain_status
ON sites (domain, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_popularity_desc
ON sites (popularity DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_owner_optout
ON sites (owner_optout, popularity DESC);

-- Scan performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_site_finished
ON scans (site_id, finished_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_status_created
ON scans (status, created_at DESC);

-- CSS sources performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_css_sources_scan_kind
ON css_sources (scan_id, kind);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_css_sources_content_trgm
ON css_sources USING GIN (content gin_trgm_ops);

-- Layout profiles performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_layout_profiles_site
ON layout_profiles (site_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_layout_profiles_profile_gin
ON layout_profiles USING GIN (profile_json);

-- MCP usage tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_usage_created_at
ON mcp_usage (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_usage_tool_user
ON mcp_usage (tool_name, user_id, created_at DESC);

-- Background jobs indexes (if job table exists)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_created
-- ON jobs (status, created_at DESC);

-- Analyze tables after index creation
ANALYZE sites;
ANALYZE token_sets;
ANALYZE scans;
ANALYZE css_sources;
ANALYZE layout_profiles;
ANALYZE mcp_usage;