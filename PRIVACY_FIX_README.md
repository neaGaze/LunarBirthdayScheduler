# Privacy Fix: User Data Isolation

## Issue Description

Users could see all birthdays and events from other users instead of only seeing their own data.

## Root Cause

The database Row Level Security (RLS) policies were missing or not properly configured:

1. **Missing INSERT policy** for the `users` table, preventing users from creating their own profile
2. **RLS policies may not have been applied** to your Supabase database (even though they were defined in the schema file)
3. **Type casting inconsistency** in UUID comparisons (`auth.uid()::text` vs `auth.uid()`)

## Solution

We've created a database migration that:
- Adds the missing INSERT policy for the users table
- Ensures RLS is enabled on all tables
- Recreates all RLS policies with correct UUID comparisons
- Adds missing `event_sync_years` column to user_settings table

## How to Apply the Fix

### Step 1: Run the Migration Script

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Navigate to: **SQL Editor** (in the left sidebar)
4. Click **"New Query"**
5. Copy the entire contents of `supabase-rls-fix.sql`
6. Paste into the SQL Editor
7. Click **"Run"** to execute the migration

### Step 2: Verify the Fix

After running the migration, verify that RLS is working:

1. Log in to your application with **User A**
2. Create some events and birthdays
3. Log out
4. Log in with **User B** (different account)
5. Create different events and birthdays
6. **Verify**: User A should ONLY see their own data, NOT User B's data

### Step 3: Clear Browser Cache (Optional)

If you still see old data:
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Refresh the page

## What Changed

### Files Modified

1. **`supabase-schema.sql`** - Updated original schema with:
   - Added missing `INSERT` policy for users table
   - Fixed UUID comparisons (removed unnecessary `::text` casting)
   - Added `event_sync_years` column to user_settings table

2. **`supabase-rls-fix.sql`** - New migration file that:
   - Can be run on existing databases to fix the issue
   - Safely drops and recreates all RLS policies
   - Adds missing columns

### RLS Policies Applied

The migration ensures these policies are active:

**Users Table:**
- Users can view own profile
- Users can **insert** own profile (NEW - this was missing!)
- Users can update own profile

**Events Table:**
- Users can view own events
- Users can insert own events
- Users can update own events
- Users can delete own events

**Birthdays Table:**
- Users can view own birthdays
- Users can insert own birthdays
- Users can update own birthdays
- Users can delete own birthdays

**Sync Mappings Table:**
- Users can view own sync mappings
- Users can insert own sync mappings
- Users can update own sync mappings
- Users can delete own sync mappings

**User Settings Table:**
- Users can view own settings
- Users can insert own settings
- Users can update own settings

## Technical Details

### How RLS Works

Row Level Security (RLS) is enforced at the **PostgreSQL database level**, which means:

- Even if client-side code tries to access other users' data, the database will block it
- The `auth.uid()` function returns the authenticated user's UUID from their JWT token
- All queries are automatically filtered to match `auth.uid() = user_id`

### Client-Side Filtering

You may notice in the code that we also filter by `userId` on the client side:

```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId);  // This is redundant but harmless
```

This client-side filter is **redundant** because RLS already filters at the database level. However, it's harmless and provides an extra layer of clarity in the code.

## Testing

To test that the fix is working:

```sql
-- Run this in Supabase SQL Editor while logged in as User A
SELECT * FROM events;
-- Should ONLY return User A's events, not all events

SELECT * FROM birthdays;
-- Should ONLY return User A's birthdays, not all birthdays
```

## Troubleshooting

### Issue: Still seeing other users' data

**Solution:**
1. Make sure you ran the migration script in Supabase SQL Editor
2. Check that you see "Success" message after running the script
3. Clear browser localStorage and refresh
4. Log out and log back in

### Issue: Migration script fails

**Solution:**
1. Check the error message in Supabase SQL Editor
2. If policies already exist, the script will drop and recreate them (safe)
3. If you see permission errors, ensure you're using the Supabase dashboard (which has admin access)

### Issue: Can't create new events/birthdays

**Solution:**
1. This could mean the INSERT policies aren't working
2. Make sure you're logged in (check that `auth.uid()` is not null)
3. Try logging out and back in to refresh your session token

## For New Installations

If you're setting up a fresh database:
- Use the updated `supabase-schema.sql` file
- No need to run the migration script (it's already included in the schema)

## For Existing Installations

If you already have a database with data:
- Run the `supabase-rls-fix.sql` migration script
- Your existing data will remain intact
- Only the policies will be updated

## Security Notes

1. **RLS is enforced at the database level** - Even a malicious client can't bypass it
2. **All tables have RLS enabled** - No table is exposed without policies
3. **JWT tokens are validated** - Supabase automatically validates authentication tokens
4. **user_id is a UUID foreign key** - Prevents spoofing or tampering

## Questions or Issues?

If you continue to experience privacy issues after applying this fix:
1. Check browser console for any errors
2. Verify your Supabase project's authentication settings
3. Ensure you're using the latest version of the Supabase client library
4. Contact support with specific error messages
