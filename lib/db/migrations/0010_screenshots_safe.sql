-- Safe migration: Add screenshots table without touching existing CSS data

-- 1. Create css_content table for future deduplication
CREATE TABLE IF NOT EXISTS css_content (
  sha VARCHAR(64) PRIMARY KEY,
  content TEXT NOT NULL,
  content_compressed BOOLEAN DEFAULT true NOT NULL,
  bytes INTEGER DEFAULT 0 NOT NULL,
  compressed_bytes INTEGER DEFAULT 0 NOT NULL,
  reference_count INTEGER DEFAULT 0 NOT NULL,
  ttl_days INTEGER DEFAULT 30 NOT NULL,
  first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
  last_accessed TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  viewport VARCHAR(50) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  captured_at TIMESTAMP DEFAULT NOW() NOT NULL,
  selector TEXT,
  label VARCHAR(100)
);

-- 3. Add indexes for screenshots
CREATE INDEX IF NOT EXISTS idx_screenshots_scan ON screenshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_viewport ON screenshots(viewport);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured ON screenshots(captured_at);

-- Note: CSS deduplication migration will be run separately to avoid data loss
-- For now, css_sources.content remains intact