-- Add screenshots table for multi-viewport component screenshots
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  viewport VARCHAR(50) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
  selector TEXT,
  label VARCHAR(100)
);

-- Index for efficient lookup by scan
CREATE INDEX idx_screenshots_scan ON screenshots(scan_id);

-- Index for viewport filtering
CREATE INDEX idx_screenshots_viewport ON screenshots(viewport);