-- ============================================
-- RLS POLICY FIX FOR USER PRIVACY
-- ============================================
-- This migration adds missing Row Level Security policies
-- to ensure users can only see their own data.
--
-- HOW TO APPLY:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to: SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" to execute
--
-- This will fix the privacy issue where users could see
-- each other's birthdays and events.
-- ============================================

-- First, add missing columns if they don't exist
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS event_sync_years INTEGER DEFAULT 1;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Events table policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- Birthdays table policies
DROP POLICY IF EXISTS "Users can view own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can insert own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can update own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can delete own birthdays" ON birthdays;

-- Sync mappings table policies
DROP POLICY IF EXISTS "Users can view own sync mappings" ON sync_mappings;
DROP POLICY IF EXISTS "Users can insert own sync mappings" ON sync_mappings;
DROP POLICY IF EXISTS "Users can update own sync mappings" ON sync_mappings;
DROP POLICY IF EXISTS "Users can delete own sync mappings" ON sync_mappings;

-- User settings table policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- ============================================
-- CREATE UPDATED POLICIES
-- ============================================

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Events table policies
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = user_id);

-- Birthdays table policies
CREATE POLICY "Users can view own birthdays"
  ON birthdays FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own birthdays"
  ON birthdays FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own birthdays"
  ON birthdays FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own birthdays"
  ON birthdays FOR DELETE
  USING (auth.uid() = user_id);

-- Sync mappings table policies
CREATE POLICY "Users can view own sync mappings"
  ON sync_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync mappings"
  ON sync_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync mappings"
  ON sync_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync mappings"
  ON sync_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- User settings table policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFY RLS IS WORKING
-- ============================================

-- After running this script, you can verify RLS is working by:
-- 1. SELECT * FROM users; (should only show your user)
-- 2. SELECT * FROM events; (should only show your events)
-- 3. SELECT * FROM birthdays; (should only show your birthdays)
--
-- If you see all users' data, RLS is not working correctly.
-- Make sure you're logged in and using the authenticated user context.

-- ============================================
-- IMPORTANT NOTES
-- ============================================

-- 1. The key difference from the original schema:
--    - Added missing INSERT policy for users table
--    - Changed auth.uid()::text to just auth.uid() (cleaner, UUID comparison)
--
-- 2. RLS Enforcement:
--    - RLS policies are enforced at the database level
--    - Even if client-side code tries to access other users' data, it will be blocked
--    - The .eq('user_id', userId) filters in the code are redundant but harmless
--
-- 3. Testing:
--    - Log in with User A, create events/birthdays
--    - Log in with User B, create different events/birthdays
--    - User A should NOT see User B's data and vice versa
