-- Enable RLS on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE css_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE remixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Sites policies (public read for non-opted-out sites)
CREATE POLICY "Sites are publicly readable" ON sites
  FOR SELECT USING (owner_optout = false);

CREATE POLICY "Users can insert sites" ON sites
  FOR INSERT WITH CHECK (true);

-- Scans policies (public read for completed scans of public sites)
CREATE POLICY "Scans are publicly readable" ON scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = scans.site_id
      AND sites.owner_optout = false
    )
  );

-- Token sets policies
CREATE POLICY "Public token sets are readable" ON token_sets
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can read their own token sets" ON token_sets
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create token sets" ON token_sets
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own token sets" ON token_sets
  FOR UPDATE USING (created_by = auth.uid());

-- Layout profiles policies (public read)
CREATE POLICY "Layout profiles are publicly readable" ON layout_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = layout_profiles.site_id
      AND sites.owner_optout = false
    )
  );

-- Submissions policies
CREATE POLICY "Users can read their own submissions" ON submissions
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Users can create submissions" ON submissions
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid() OR submitted_by IS NULL
  );

-- Token votes policies
CREATE POLICY "Users can read all votes" ON token_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can create votes" ON token_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own votes" ON token_votes
  FOR UPDATE USING (user_id = auth.uid());

-- Remixes policies
CREATE POLICY "Public remixes are readable" ON remixes
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can read their own remixes" ON remixes
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create remixes" ON remixes
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own remixes" ON remixes
  FOR UPDATE USING (created_by = auth.uid());

-- Users policies
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can read their own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- API keys policies
CREATE POLICY "Users can read their own API keys" ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create API keys" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- MCP usage policies
CREATE POLICY "Users can read their own MCP usage" ON mcp_usage
  FOR SELECT USING (user_id = auth.uid());

-- Audit log policies (admin only)
CREATE POLICY "Admins can read audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Functions for RLS
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;