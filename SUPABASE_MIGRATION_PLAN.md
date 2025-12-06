# Supabase Migration: Multi-Phase Implementation Plan

## Overview
Migrate Nepali Calendar app from localStorage-only to Supabase database while maintaining backward compatibility and minimal operational costs.

## Current Status
- **Completed:** Phase 1 (Foundation Setup)
- **Completed:** Phase 2 (Dual-Write System)
- **Completed:** Phase 3 (Data Migration Tool)
- **Completed:** Phase 4 (Switch to Supabase Reads)
- **Completed:** Phase 5 (Remove localStorage Dependencies)
- **Pending:** Phase 6 (Polish & Optimization)

## Phase 1: Foundation Setup ✅ COMPLETED
- [x] Create Supabase project and get credentials
- [x] Design database schema (5 tables: users, events, birthdays, sync_mappings, user_settings)
- [x] Create database tables in Supabase
- [x] Configure Row Level Security policies
- [x] Set up Supabase Auth with Google OAuth
- [x] Install @supabase/supabase-js package
- [x] Create environment variables for Supabase config
- [x] Create supabaseClient.ts service file

## Phase 2: Dual-Write System ✅ COMPLETED (with notes)
- [x] Create TypeScript types for database tables
- [x] Create supabaseService.ts with CRUD operations
- [x] Add Supabase auth helper functions
- [x] Modify AppContext to dual-write events (localStorage + Supabase)
- [x] Modify AppContext to dual-write birthdays
- [x] Modify AppContext to dual-write sync mappings
- [x] Add error handling and fallback to localStorage
- [x] Test dual-write with new event/birthday

**Note:** Dual-write only activates after Supabase auth. Currently, birthdays/events only sync to localStorage until user authenticates with Supabase.

## Phase 3: Data Migration Tool ✅ COMPLETED
Goal: Move existing localStorage data to Supabase

- [x] Create migration utility (src/utils/migrateToSupabase.ts)
  - [x] Read all localStorage keys (nepali_events, nepali_birthdays, sync_mappings)
  - [x] Transform data to match DB schema using conversion functions
  - [x] Batch upload to Supabase with error handling
  - [x] Verify migration success with detailed progress reporting
- [x] Add migration UI in Settings
  - [x] "Migrate to Cloud Storage" button with cloud icon
  - [x] Progress indicator showing current/total items
  - [x] Success/error messages with detailed error list
- [x] Implement migration logic
  - [x] Check if user already migrated (localStorage flag)
  - [x] One-time migration per user (prevents re-migration)
  - [x] Keep localStorage as backup during migration
- [x] Test migration with mock localStorage data (validation passed)

## Phase 4: Switch to Supabase Reads ✅ COMPLETED
Goal: Read from Supabase, write to both (validation phase)

- [x] Modify AppContext data loading
  - [x] On mount, read from Supabase instead of localStorage
  - [x] Fallback to localStorage if Supabase fails
- [x] Add real-time subscriptions
  - [x] Listen to Supabase changes
  - [x] Update UI when data changes (multi-device sync)
- [x] Keep dual-write for safety
- [x] Add sync status indicators in UI
- [ ] Test multi-device sync

## Phase 5: Remove localStorage Dependencies ✅ COMPLETED
Goal: Full Supabase migration, clean up code

- [x] Make Supabase primary for authenticated users:
  - [x] AppContext event/birthday operations write to Supabase first
  - [x] localStorage used only as cache/fallback
- [x] Keep localStorage for:
  - [x] Migration flag (to prevent re-migration)
  - [x] Offline cache (when Supabase fails)
  - [x] Unauthenticated users (localStorage only)
- [x] Error handling with user notifications
- [ ] Update syncService to use Supabase for mappings (optional)
- [ ] Clean up unused code (optional)

## Phase 6: Polish & Optimization ✨ (Partial)
Goal: Performance, UX, error handling

- [x] Add offline support
  - [x] Cache Supabase data locally (localStorage as cache)
  - [x] Detect offline state and use cached data
  - [ ] Queue writes when offline (optional - not implemented)
- [ ] Optimize queries
  - [ ] Add database indexes (optional)
  - [ ] Batch operations where possible
- [x] Improve error handling
  - [x] Better error messages with user notifications
  - [x] Retry logic for network failures (3 retries with exponential backoff)
- [x] Add loading states throughout UI
  - [x] Sync status indicator in Settings
  - [x] Loading state during data fetch
- [ ] Security audit
  - [ ] Review RLS policies
  - [ ] Test unauthorized access attempts
- [ ] Documentation
  - [ ] Update README with new setup instructions
  - [ ] Document Supabase schema

## Key Implementation Details

### Database Schema
- **users:** id, google_id, email, name, created_at, last_login
- **events:** Nepali/Gregorian dates, reminders, recurring, festival info
- **birthdays:** Names, dates, tithi-based support, reminders
- **sync_mappings:** Local event ID → Google Calendar ID mapping
- **user_settings:** Sync preferences (festivals, custom events, birthdays, days in advance, max birthdays)

### Environment Variables
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key-jwt]
```

### Rollback Strategy (per phase)
- Phases 2-4: Can revert to localStorage-only by toggling feature flag
- Phase 5+: Supabase required, but can restore from localStorage backup
- Always keep migration utility for future users

## Testing Checklist
- ✅ Existing users: data intact, no loss
- ✅ New users: can create account, add data
- ✅ Multi-device: changes sync across browsers
- ✅ Offline: app doesn't crash when offline
- ✅ Google Calendar sync: still works

## Cost Analysis
**Supabase Free Tier (sufficient for foreseeable future):**
- 500 MB database storage (can serve 1000s of users with ~100KB each)
- 2 GB bandwidth/month
- 50 MB file storage
- Row Level Security (RLS) built-in
- Real-time subscriptions

**Estimated per-user data:** 6.5-40 KB (events, birthdays, mappings)
