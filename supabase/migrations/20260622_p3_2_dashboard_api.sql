ALTER TABLE user_external_agents
  ADD COLUMN IF NOT EXISTS dashboard_api_url TEXT,
  ADD COLUMN IF NOT EXISTS dashboard_session_token TEXT;
