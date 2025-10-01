-- Screenshot deduplication migration
-- Similar to CSS deduplication, share screenshot data across multiple scans

-- 1. Create screenshot_content table for deduplicated storage
CREATE TABLE IF NOT EXISTS screenshot_content (
  sha VARCHAR(64) PRIMARY KEY,
  url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  reference_count INTEGER DEFAULT 0 NOT NULL,
  ttl_days INTEGER DEFAULT 90 NOT NULL,
  first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
  last_accessed TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for screenshot_content
CREATE INDEX IF NOT EXISTS idx_screenshot_content_reference_count ON screenshot_content(reference_count);
CREATE INDEX IF NOT EXISTS idx_screenshot_content_last_accessed ON screenshot_content(last_accessed);

-- 3. Backup existing screenshots table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'screenshots'
  ) THEN
    -- Create backup table
    CREATE TABLE IF NOT EXISTS screenshots_backup AS
    SELECT * FROM screenshots;

    -- Drop old table
    DROP TABLE IF EXISTS screenshots CASCADE;
  END IF;
END
$$;

-- 4. Create new screenshots table with SHA reference
-- Each site keeps only the LATEST screenshot per viewport (replaced on every scan)
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  sha VARCHAR(64) NOT NULL REFERENCES screenshot_content(sha) ON DELETE CASCADE,
  viewport VARCHAR(50) NOT NULL,
  captured_at TIMESTAMP DEFAULT NOW() NOT NULL,
  selector TEXT,
  label VARCHAR(100),
  CONSTRAINT unique_site_viewport UNIQUE (site_id, viewport)
);

-- 5. Create indexes for screenshots
CREATE INDEX IF NOT EXISTS idx_screenshots_site ON screenshots(site_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_scan ON screenshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_sha ON screenshots(sha);
CREATE INDEX IF NOT EXISTS idx_screenshots_viewport ON screenshots(viewport);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured ON screenshots(captured_at);

-- 6. Create function to update reference counts
CREATE OR REPLACE FUNCTION update_screenshot_reference_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE screenshot_content
    SET reference_count = reference_count + 1,
        last_accessed = NOW()
    WHERE sha = NEW.sha;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE screenshot_content
    SET reference_count = reference_count - 1
    WHERE sha = OLD.sha;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for reference count management
DROP TRIGGER IF EXISTS screenshot_reference_count_trigger ON screenshots;
CREATE TRIGGER screenshot_reference_count_trigger
  AFTER INSERT OR DELETE ON screenshots
  FOR EACH ROW
  EXECUTE FUNCTION update_screenshot_reference_count();

-- 8. Create cleanup function for orphaned screenshots
CREATE OR REPLACE FUNCTION cleanup_orphaned_screenshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM screenshot_content
  WHERE reference_count = 0
    AND last_accessed < NOW() - (ttl_days || ' days')::INTERVAL
  RETURNING count(*) INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_orphaned_screenshots() IS 'Cleanup screenshots with zero references after TTL expires';
