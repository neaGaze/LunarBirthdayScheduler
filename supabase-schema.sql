-- Nepali Calendar Database Schema for Supabase
-- Run this in Supabase SQL Editor: Database → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nepali_year INTEGER NOT NULL,
  nepali_month INTEGER NOT NULL,
  nepali_day INTEGER NOT NULL,
  gregorian_year INTEGER NOT NULL,
  gregorian_month INTEGER NOT NULL,
  gregorian_day INTEGER NOT NULL,
  description TEXT,
  is_festival BOOLEAN DEFAULT FALSE,
  is_lunar_event BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER DEFAULT 1440,
  recurring_pattern TEXT, -- 'yearly' | 'monthly' | null
  recurring_end_year INTEGER,
  recurring_end_month INTEGER,
  recurring_end_day INTEGER,
  festival_is_multi_day BOOLEAN DEFAULT FALSE,
  festival_start_day INTEGER,
  festival_end_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_nepali_date ON events(nepali_year, nepali_month, nepali_day);
CREATE INDEX idx_events_gregorian_date ON events(gregorian_year, gregorian_month, gregorian_day);

-- ============================================
-- BIRTHDAYS TABLE
-- ============================================
CREATE TABLE birthdays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nepali_year INTEGER NOT NULL,
  nepali_month INTEGER NOT NULL,
  nepali_day INTEGER NOT NULL,
  gregorian_year INTEGER NOT NULL,
  gregorian_month INTEGER NOT NULL,
  gregorian_day INTEGER NOT NULL,
  is_tithi_based BOOLEAN DEFAULT FALSE,
  tithi_number INTEGER,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER DEFAULT 1440,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_birthdays_user_id ON birthdays(user_id);
CREATE INDEX idx_birthdays_name ON birthdays(name);

-- ============================================
-- SYNC MAPPINGS TABLE
-- ============================================
CREATE TABLE sync_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_event_id UUID NOT NULL, -- References events.id or birthdays.id
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('event', 'birthday')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_mappings_user_id ON sync_mappings(user_id);
CREATE INDEX idx_sync_mappings_local_event_id ON sync_mappings(local_event_id);
CREATE INDEX idx_sync_mappings_google_event_id ON sync_mappings(google_event_id);

-- Unique constraint to prevent duplicate mappings
CREATE UNIQUE INDEX idx_sync_mappings_unique ON sync_mappings(user_id, local_event_id, google_event_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calendar_id TEXT DEFAULT 'primary',
  sync_festivals BOOLEAN DEFAULT TRUE,
  sync_custom_events BOOLEAN DEFAULT TRUE,
  sync_birthdays BOOLEAN DEFAULT TRUE,
  days_in_advance INTEGER DEFAULT 90,
  max_birthdays_to_sync INTEGER DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Events table policies
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Birthdays table policies
CREATE POLICY "Users can view own birthdays"
  ON birthdays FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own birthdays"
  ON birthdays FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own birthdays"
  ON birthdays FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own birthdays"
  ON birthdays FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Sync mappings table policies
CREATE POLICY "Users can view own sync mappings"
  ON sync_mappings FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sync mappings"
  ON sync_mappings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sync mappings"
  ON sync_mappings FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sync mappings"
  ON sync_mappings FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- User settings table policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_birthdays_updated_at
  BEFORE UPDATE ON birthdays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create settings when user is created
CREATE TRIGGER create_user_settings_on_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_settings();

-- ============================================
-- HELPFUL QUERIES (for testing)
-- ============================================

-- View all data for a user
-- SELECT * FROM users WHERE google_id = 'your-google-id';
-- SELECT * FROM events WHERE user_id = 'user-uuid';
-- SELECT * FROM birthdays WHERE user_id = 'user-uuid';
-- SELECT * FROM sync_mappings WHERE user_id = 'user-uuid';
-- SELECT * FROM user_settings WHERE user_id = 'user-uuid';
