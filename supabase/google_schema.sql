-- Add to schema.sql after existing tables

CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  google_email TEXT,
  refresh_token TEXT, -- store encrypted in production
  access_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  account_names TEXT[],
  last_sync TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' -- pending, connected, approval_required, revoked
);

ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;