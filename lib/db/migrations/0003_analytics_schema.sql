-- Migration: Comprehensive Analytics Schema
-- Date: 2025-09-29
-- Description: Add analytics tables, materialized views, and query functions for extracting any metric
-- Features: Token analytics, search analytics, Vercel integration, domain analytics

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================

-- Track all user interactions and events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- 'page_view', 'scan_request', 'search', 'vote', etc
  event_name VARCHAR(255) NOT NULL, -- Specific event name
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- For anonymous tracking

  -- Event context
  url TEXT, -- URL where event occurred
  referrer TEXT, -- Referrer URL
  user_agent TEXT, -- Browser/device info
  ip_address INET, -- For geo analytics
  country_code VARCHAR(2), -- ISO country code

  -- Event data (flexible JSON)
  properties JSONB, -- Event-specific properties

  -- Vercel Analytics integration
  vercel_analytics_id VARCHAR(255), -- Vercel Web Analytics ID
  vercel_speed_insight JSONB, -- Speed Insights data

  -- Timing
  duration_ms INTEGER, -- Event duration if applicable
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for analytics events
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_properties_gin ON analytics_events USING GIN (properties);

-- Partition by month for scalability
-- CREATE TABLE analytics_events_2025_09 PARTITION OF analytics_events
--   FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- ============================================================================
-- TOKEN ANALYTICS TABLE
-- ============================================================================

-- Pre-computed token metrics for fast analytics
CREATE TABLE IF NOT EXISTS token_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  token_set_id UUID NOT NULL REFERENCES token_sets(id) ON DELETE CASCADE,

  -- Color analytics
  total_colors INTEGER DEFAULT 0,
  neutral_colors INTEGER DEFAULT 0, -- Grays, blacks, whites
  brand_colors INTEGER DEFAULT 0, -- Non-neutral colors
  blue_colors INTEGER DEFAULT 0,
  red_colors INTEGER DEFAULT 0,
  green_colors INTEGER DEFAULT 0,
  unique_hues INTEGER DEFAULT 0,
  color_harmony_score DECIMAL(5,2), -- 0-100 score

  -- Typography analytics
  total_fonts INTEGER DEFAULT 0,
  sans_serif_fonts INTEGER DEFAULT 0,
  serif_fonts INTEGER DEFAULT 0,
  monospace_fonts INTEGER DEFAULT 0,
  font_weights_count INTEGER DEFAULT 0,
  font_sizes_count INTEGER DEFAULT 0,

  -- Spacing analytics
  total_spacing_values INTEGER DEFAULT 0,
  min_spacing DECIMAL(10,2),
  max_spacing DECIMAL(10,2),
  spacing_scale_type VARCHAR(50), -- 'linear', 'exponential', 'custom'
  spacing_consistency_score DECIMAL(5,2),

  -- Border radius analytics
  total_radius_values INTEGER DEFAULT 0,
  sharp_corners INTEGER DEFAULT 0, -- 0px
  rounded_corners INTEGER DEFAULT 0, -- 4-8px
  pill_corners INTEGER DEFAULT 0, -- >20px or 50%

  -- Shadow analytics
  total_shadows INTEGER DEFAULT 0,
  subtle_shadows INTEGER DEFAULT 0,
  medium_shadows INTEGER DEFAULT 0,
  strong_shadows INTEGER DEFAULT 0,

  -- Overall design system maturity
  maturity_score DECIMAL(5,2), -- 0-100
  consistency_score DECIMAL(5,2), -- 0-100

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_analytics_site ON token_analytics(site_id);
CREATE INDEX idx_token_analytics_colors ON token_analytics(total_colors, neutral_colors, brand_colors);
CREATE INDEX idx_token_analytics_maturity ON token_analytics(maturity_score DESC);

-- ============================================================================
-- DOMAIN ANALYTICS TABLE
-- ============================================================================

-- Track domain-level statistics
CREATE TABLE IF NOT EXISTS domain_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  tld VARCHAR(50), -- Top-level domain (.com, .org, etc)

  -- Scan statistics
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  failed_scans INTEGER DEFAULT 0,
  avg_scan_duration_ms DECIMAL(10,2),

  -- Token statistics
  avg_tokens_extracted INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(5,2),

  -- Popularity metrics
  search_count INTEGER DEFAULT 0, -- How many times searched
  view_count INTEGER DEFAULT 0, -- How many times viewed
  vote_count INTEGER DEFAULT 0, -- Community votes received

  -- Traffic sources
  organic_traffic INTEGER DEFAULT 0,
  direct_traffic INTEGER DEFAULT 0,
  referral_traffic INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_domain_analytics_tld ON domain_analytics(tld);
CREATE INDEX idx_domain_analytics_search ON domain_analytics(search_count DESC);
CREATE INDEX idx_domain_analytics_popularity ON domain_analytics(view_count DESC);

-- ============================================================================
-- SEARCH ANALYTICS TABLE
-- ============================================================================

-- Track search queries and results
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  query_normalized TEXT, -- Lowercase, trimmed

  -- Search context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Results
  results_count INTEGER DEFAULT 0,
  clicked_result_position INTEGER, -- Which result was clicked (1-based)
  clicked_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,

  -- Metadata
  search_filters JSONB, -- Applied filters
  search_duration_ms INTEGER, -- Time to execute search

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_analytics_query ON search_analytics(query_normalized, created_at DESC);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id, created_at DESC);
CREATE INDEX idx_search_analytics_results ON search_analytics(results_count);

-- ============================================================================
-- VERCEL ANALYTICS TABLE
-- ============================================================================

-- Store Vercel Web Analytics and Speed Insights data
CREATE TABLE IF NOT EXISTS vercel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Web Analytics
  page_url TEXT NOT NULL,
  referrer TEXT,
  visitor_id VARCHAR(255), -- Vercel's visitor ID
  session_id VARCHAR(255),

  -- Speed Insights
  cls DECIMAL(5,3), -- Cumulative Layout Shift
  fcp INTEGER, -- First Contentful Paint (ms)
  fid INTEGER, -- First Input Delay (ms)
  lcp INTEGER, -- Largest Contentful Paint (ms)
  ttfb INTEGER, -- Time to First Byte (ms)
  inp INTEGER, -- Interaction to Next Paint (ms)

  -- Device & Browser
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Geographic
  country VARCHAR(100),
  city VARCHAR(100),
  region VARCHAR(100),

  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vercel_analytics_page ON vercel_analytics(page_url, created_at DESC);
CREATE INDEX idx_vercel_analytics_visitor ON vercel_analytics(visitor_id, created_at DESC);
CREATE INDEX idx_vercel_analytics_lcp ON vercel_analytics(lcp);
CREATE INDEX idx_vercel_analytics_country ON vercel_analytics(country);

-- ============================================================================
-- MATERIALIZED VIEWS FOR FAST ANALYTICS
-- ============================================================================

-- View: Daily token statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_token_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_scans,
  AVG((tokens_json::jsonb -> 'summary' ->> 'totalTokens')::INTEGER) as avg_tokens,
  SUM((tokens_json::jsonb -> 'summary' ->> 'totalTokens')::INTEGER) as total_tokens_extracted
FROM token_sets
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_daily_token_stats(date);

-- View: Most popular domains
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_domains AS
SELECT
  s.domain,
  COUNT(DISTINCT sc.id) as scan_count,
  MAX(sc.finished_at) as last_scan,
  s.popularity as view_count
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id
WHERE s.owner_optout = false
GROUP BY s.id, s.domain, s.popularity
ORDER BY scan_count DESC, s.popularity DESC
LIMIT 1000;

CREATE UNIQUE INDEX ON mv_popular_domains(domain);

-- View: Color distribution across all sites
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_color_distribution AS
SELECT
  token_path,
  token_value,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT ta.site_id) as site_count
FROM token_analytics ta
JOIN token_sets ts ON ta.token_set_id = ts.id,
  LATERAL jsonb_each_text(ts.tokens_json) AS t(token_path, token_value)
WHERE token_path LIKE '%.color.%'
GROUP BY token_path, token_value
HAVING COUNT(*) > 5
ORDER BY occurrence_count DESC
LIMIT 10000;

-- View: Search trends
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_search_trends AS
SELECT
  query_normalized,
  COUNT(*) as search_count,
  AVG(results_count) as avg_results,
  MAX(created_at) as last_searched
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY query_normalized
ORDER BY search_count DESC
LIMIT 1000;

CREATE UNIQUE INDEX ON mv_search_trends(query_normalized);

-- ============================================================================
-- ANALYTICS HELPER FUNCTIONS
-- ============================================================================

-- Function: Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_token_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_domains;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_color_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_trends;
END;
$$ LANGUAGE plpgsql;

-- Function: Get token analytics by color type
CREATE OR REPLACE FUNCTION get_color_analytics(
  color_type VARCHAR DEFAULT NULL, -- 'neutral', 'blue', 'red', 'green'
  min_sites INTEGER DEFAULT 5
)
RETURNS TABLE (
  color_value TEXT,
  occurrence_count BIGINT,
  site_count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    token_value::TEXT,
    occurrence_count,
    site_count,
    ROUND((occurrence_count::DECIMAL / SUM(occurrence_count) OVER ()) * 100, 2) as percentage
  FROM mv_color_distribution
  WHERE (color_type IS NULL OR token_path ILIKE '%' || color_type || '%')
    AND site_count >= min_sites
  ORDER BY occurrence_count DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function: Get domain statistics by TLD
CREATE OR REPLACE FUNCTION get_domain_stats_by_tld()
RETURNS TABLE (
  tld VARCHAR,
  domain_count BIGINT,
  total_scans BIGINT,
  avg_tokens DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.tld,
    COUNT(*)::BIGINT as domain_count,
    SUM(da.total_scans)::BIGINT as total_scans,
    AVG(da.avg_tokens_extracted)::DECIMAL as avg_tokens
  FROM domain_analytics da
  GROUP BY da.tld
  ORDER BY domain_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get search analytics
CREATE OR REPLACE FUNCTION get_search_stats(
  days INTEGER DEFAULT 30
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  avg_results DECIMAL,
  click_through_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.query_normalized::TEXT,
    COUNT(*)::BIGINT as search_count,
    AVG(sa.results_count)::DECIMAL as avg_results,
    ROUND((COUNT(*) FILTER (WHERE sa.clicked_site_id IS NOT NULL)::DECIMAL / COUNT(*)) * 100, 2) as click_through_rate
  FROM search_analytics sa
  WHERE sa.created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY sa.query_normalized
  ORDER BY search_count DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC ANALYTICS UPDATES
-- ============================================================================

-- Trigger: Update domain_analytics on scan completion
CREATE OR REPLACE FUNCTION update_domain_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    -- Scan just completed
    INSERT INTO domain_analytics (domain, tld, total_scans, successful_scans, avg_scan_duration_ms)
    SELECT
      s.domain,
      SUBSTRING(s.domain FROM '\.([^.]+)$') as tld,
      1,
      CASE WHEN NEW.error IS NULL THEN 1 ELSE 0 END,
      EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at)) * 1000
    FROM sites s
    WHERE s.id = NEW.site_id
    ON CONFLICT (domain) DO UPDATE SET
      total_scans = domain_analytics.total_scans + 1,
      successful_scans = domain_analytics.successful_scans + CASE WHEN NEW.error IS NULL THEN 1 ELSE 0 END,
      failed_scans = domain_analytics.failed_scans + CASE WHEN NEW.error IS NOT NULL THEN 1 ELSE 0 END,
      avg_scan_duration_ms = (
        domain_analytics.avg_scan_duration_ms * domain_analytics.total_scans +
        EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at)) * 1000
      ) / (domain_analytics.total_scans + 1),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_domain_analytics
AFTER UPDATE ON scans
FOR EACH ROW
EXECUTE FUNCTION update_domain_analytics();

-- Trigger: Compute token analytics on token set creation
CREATE OR REPLACE FUNCTION compute_token_analytics()
RETURNS TRIGGER AS $$
DECLARE
  tokens JSONB;
  color_count INTEGER;
BEGIN
  tokens := NEW.tokens_json;

  -- Basic color counting (can be enhanced)
  SELECT COUNT(*) INTO color_count
  FROM jsonb_each(tokens)
  WHERE key LIKE '%color%';

  INSERT INTO token_analytics (
    site_id,
    token_set_id,
    total_colors,
    created_at
  ) VALUES (
    NEW.site_id,
    NEW.id,
    color_count,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_token_analytics
AFTER INSERT ON token_sets
FOR EACH ROW
EXECUTE FUNCTION compute_token_analytics();

-- ============================================================================
-- SCHEDULED JOBS (PostgreSQL pg_cron or external scheduler)
-- ============================================================================

-- Refresh materialized views daily at 2 AM
-- SELECT cron.schedule('refresh-analytics', '0 2 * * *', 'SELECT refresh_analytics_views()');

-- Clean up old analytics events (keep 90 days)
-- SELECT cron.schedule('cleanup-analytics', '0 3 * * *',
--   'DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL ''90 days''');

-- ============================================================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================================================

-- Composite indexes for common analytics queries
CREATE INDEX idx_token_sets_site_created ON token_sets(site_id, created_at DESC);
CREATE INDEX idx_scans_site_finished_error ON scans(site_id, finished_at, error);

-- JSONB path indexes for specific token queries
CREATE INDEX idx_token_sets_colors ON token_sets USING GIN ((tokens_json -> 'colors'));
CREATE INDEX idx_token_sets_spacing ON token_sets USING GIN ((tokens_json -> 'spacing'));
CREATE INDEX idx_token_sets_typography ON token_sets USING GIN ((tokens_json -> 'typography'));

-- ============================================================================
-- GRANT PERMISSIONS (if using separate analytics user)
-- ============================================================================

-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO analytics_user;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Analytics capabilities added:
-- ✅ Track all user events and interactions
-- ✅ Pre-computed token metrics (colors, fonts, spacing, borders)
-- ✅ Domain-level statistics (TLD, popularity, traffic)
-- ✅ Search analytics (queries, CTR, trends)
-- ✅ Vercel Web Analytics and Speed Insights integration
-- ✅ Materialized views for fast aggregations
-- ✅ Helper functions for complex queries
-- ✅ Automatic triggers for real-time analytics
-- ✅ Optimized indexes for analytics queries

-- Query examples:
-- SELECT * FROM get_color_analytics('blue', 5);
-- SELECT * FROM get_domain_stats_by_tld();
-- SELECT * FROM get_search_stats(30);
-- SELECT * FROM mv_popular_domains LIMIT 10;
-- SELECT * FROM mv_daily_token_stats ORDER BY date DESC LIMIT 30;