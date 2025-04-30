-- Initial schema migration for Forex Ring Alerts

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  last_failure_reason TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_pair ON alerts(pair);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active);

-- Enable Row Level Security (RLS) for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Temporarily allow public access for bot interaction; in production, secure with API key or other mechanism
CREATE POLICY user_access_policy ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Row Level Security (RLS) for alerts table
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- Temporarily allow public access for bot interaction; in production, secure with API key or other mechanism
CREATE POLICY alert_access_policy ON alerts
  FOR ALL
  USING (true)
  WITH CHECK (true); 