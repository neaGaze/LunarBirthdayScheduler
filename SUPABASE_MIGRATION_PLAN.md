# Supabase Migration: Multi-Phase Implementation Plan

## Overview
Migrate Nepali Calendar app from localStorage-only to Supabase database while maintaining backward compatibility and minimal operational costs.

## Current Status
- **Completed:** Phase 1 (Foundation Setup)
- **In Progress:** Phase 2 (Dual-Write System)
- **Pending:** Phases 3-6

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

## Phase 3: Data Migration Tool 🔄 NEXT
Goal: Move existing localStorage data to Supabase

- [ ] Create migration utility (src/utils/migrateToSupabase.ts)
  - [ ] Read all localStorage keys
  - [ ] Transform data to match DB schema
  - [ ] Batch upload to Supabase
  - [ ] Verify migration success
- [ ] Add migration UI in Settings
  - [ ] "Migrate to Cloud Storage" button
  - [ ] Progress indicator
  - [ ] Success/error messages
- [ ] Implement migration logic
  - [ ] Check if user already migrated (flag in Supabase)
  - [ ] One-time migration per user
  - [ ] Keep localStorage as backup during migration
- [ ] Test migration with real localStorage data

## Phase 4: Switch to Supabase Reads 📖
Goal: Read from Supabase, write to both (validation phase)

- [ ] Modify AppContext data loading
  - [ ] On mount, read from Supabase instead of localStorage
  - [ ] Fallback to localStorage if Supabase fails
- [ ] Add real-time subscriptions
  - [ ] Listen to Supabase changes
  - [ ] Update UI when data changes (multi-device sync)
- [ ] Keep dual-write for safety
- [ ] Add sync status indicators in UI
- [ ] Test multi-device sync

## Phase 5: Remove localStorage Dependencies 🧹
Goal: Full Supabase migration, clean up code

- [ ] Remove localStorage writes from:
  - [ ] AppContext event/birthday operations
  - [ ] Sync service
  - [ ] Settings component
- [ ] Keep localStorage ONLY for:
  - [ ] Migration flag (to prevent re-migration)
  - [ ] Optional offline cache
- [ ] Remove old Google OAuth code
  - [ ] Delete client-side token storage
  - [ ] Use Supabase Auth exclusively
- [ ] Update syncService to use Supabase for mappings
- [ ] Clean up unused code

## Phase 6: Polish & Optimization ✨
Goal: Performance, UX, error handling

- [ ] Add offline support
  - [ ] Cache Supabase data locally (optional)
  - [ ] Queue writes when offline
  - [ ] Sync when back online
- [ ] Optimize queries
  - [ ] Add database indexes
  - [ ] Batch operations where possible
- [ ] Improve error handling
  - [ ] Better error messages
  - [ ] Retry logic for network failures
- [ ] Add loading states throughout UI
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
