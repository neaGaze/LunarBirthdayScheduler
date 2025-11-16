/**
 * Supabase Admin Service
 * Uses service role key to bypass RLS for administrative operations
 * ONLY used for migrations and system operations, not for user data access
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('[Supabase Admin] URL:', supabaseUrl);
console.log('[Supabase Admin] Service role key exists:', !!supabaseServiceRoleKey);

// Create admin client with service role - bypasses RLS
// Falls back to regular client if service role key not available
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Get or create user (with admin bypass for RLS)
 * Falls back to regular supabase client if service role not available
 */
export async function getOrCreateUserAdmin(userId: string, email: string, name?: string) {
  const client = supabaseAdmin;

  if (!client) {
    console.warn('[Supabase Admin] Service role key not configured, operations may fail due to RLS');
    // Return a minimal user object so app can continue
    return { id: userId, email, name, google_id: userId };
  }

  try {
    // Check if user exists
    const { data: existingUser, error: selectError } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      console.log('[Supabase Admin] User exists:', userId);
      return existingUser;
    }

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      throw selectError;
    }

    // User doesn't exist, create it
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        id: userId,
        email,
        name: name || null,
        google_id: userId, // Use userId as google_id for device users
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Supabase Admin] Error creating user:', insertError);
      throw insertError;
    }

    console.log('[Supabase Admin] User created:', userId);
    return newUser;
  } catch (error) {
    console.error('[Supabase Admin] Error in getOrCreateUserAdmin:', error);
    // Return minimal user object so app can continue
    return { id: userId, email, name, google_id: userId };
  }
}
