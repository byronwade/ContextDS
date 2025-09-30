-- Additional performance indexes for frequently queried columns
-- Migration: 0011_performance_indexes_v2
-- Created: 2025-09-30

-- Index for scans ordered by site_id and created_at
CREATE INDEX IF NOT EXISTS idx_scans_site_created
ON scans(site_id, created_at DESC);

-- Index for token_sets by site and version number
CREATE INDEX IF NOT EXISTS idx_token_sets_site_version
ON token_sets(site_id, version_number DESC);

-- Index for css_sources by scan_id
CREATE INDEX IF NOT EXISTS idx_css_sources_scan
ON css_sources(scan_id);

-- Index for token_versions by token_set_id
CREATE INDEX IF NOT EXISTS idx_token_versions_token_set
ON token_versions(token_set_id);

-- Index for sites by domain (may already exist)
CREATE INDEX IF NOT EXISTS idx_sites_domain
ON sites(domain);

-- Composite index for scans by status and created_at
CREATE INDEX IF NOT EXISTS idx_scans_status_created
ON scans(status, created_at DESC);

-- Index for layout_profiles by site_id
CREATE INDEX IF NOT EXISTS idx_layout_profiles_site
ON layout_profiles(site_id);

-- Index for prompt_packs by token_set_id
CREATE INDEX IF NOT EXISTS idx_prompt_packs_token_set
ON prompt_packs(token_set_id);