-- Create screenshots table (safe migration - no data loss)

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshots_scan ON screenshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_viewport ON screenshots(viewport);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured ON screenshots(captured_at DESC);