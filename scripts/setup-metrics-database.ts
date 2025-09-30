#!/usr/bin/env bun

/**
 * Setup Metrics Database Tables
 * Creates all necessary tables for the metrics system
 */

import { Pool } from '@neondatabase/serverless'

const pool = new Pool({
  connectionString: process.env.METRICS_DATABASE_URL
})

const METRICS_SCHEMA = `
-- ============================================================================
-- METRICS TABLES FOR REAL-TIME ANALYTICS
-- ============================================================================

-- Page Views Table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  ip_hash VARCHAR(64),
  session_id VARCHAR(255),
  duration_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id, created_at DESC);

-- API Requests Table
CREATE TABLE IF NOT EXISTS api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  user_id UUID,
  api_key_id UUID,
  error_message TEXT,
  request_size INTEGER,
  response_size INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_requests(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_status ON api_requests(status_code, created_at DESC);

-- Scan Events Table
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'scanning', 'completed', 'failed')),
  tokens_extracted INTEGER,
  confidence DECIMAL(5,2),
  processing_time_ms INTEGER,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_created_at ON scan_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_domain ON scan_events(domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_status ON scan_events(status, created_at DESC);

-- Search Queries Table
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  filters JSONB,
  user_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query, created_at DESC);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type, metric_name, created_at DESC);

-- Enable TimescaleDB extension if available (optional)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('page_views', 'created_at', if_not_exists => TRUE);
-- SELECT create_hypertable('api_requests', 'created_at', if_not_exists => TRUE);
-- SELECT create_hypertable('scan_events', 'created_at', if_not_exists => TRUE);
-- SELECT create_hypertable('search_queries', 'created_at', if_not_exists => TRUE);
`

async function main() {
  console.log('🚀 Setting up metrics database tables...\n')

  if (!process.env.METRICS_DATABASE_URL) {
    console.error('❌ ERROR: METRICS_DATABASE_URL environment variable is not set')
    console.error('   Please set it in your .env file:')
    console.error('   METRICS_DATABASE_URL=postgresql://user:pass@host/metrics_db')
    process.exit(1)
  }

  try {
    console.log('📊 Creating metrics tables...')
    await pool.query(METRICS_SCHEMA)
    console.log('✅ Metrics tables created successfully')

    // Verify tables exist
    console.log('\n📋 Verifying tables...')
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('page_views', 'api_requests', 'scan_events', 'search_queries', 'system_metrics')
      ORDER BY table_name
    `)

    console.log('   Tables found:')
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`)
    })

    console.log('\n✨ Metrics database setup complete!')
    console.log('   You can now use the metrics API endpoints')

  } catch (error) {
    console.error('❌ Error setting up metrics database:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()