import { supabase } from './supabaseClient';
import type {
  DbEvent,
  DbBirthday,
  DbSyncMapping,
  DbUserSettings,
  DbEventInsert,
  DbBirthdayInsert,
  DbSyncMappingInsert,
  DbUserSettingsInsert,
  DbEventUpdate,
  DbBirthdayUpdate,
  DbUserSettingsUpdate,
} from '../types/supabase';
import type { NepaliCalendarEvent, LunarBirthday } from './nepaliEventService';

// ============================================
// TRANSFORMATION FUNCTIONS
// ============================================

/**
 * Convert app event to database format
 */
export function eventToDb(event: NepaliCalendarEvent, userId: string): DbEventInsert {
  return {
    id: event.id, // Use client-generated ID
    user_id: userId,
    title: event.title,
    nepali_year: event.nepaliDate.year,
    nepali_month: event.nepaliDate.month,
    nepali_day: event.nepaliDate.day,
    gregorian_year: event.gregorianDate.year,
    gregorian_month: event.gregorianDate.month,
    gregorian_day: event.gregorianDate.day,
    description: event.description || null,
    is_festival: event.isFestival,
    is_lunar_event: event.isLunarEvent,
    reminder_enabled: event.reminder?.enabled || false,
    reminder_minutes: event.reminder?.minutesBefore || 1440,
    recurring_pattern: event.recurring?.pattern || null,
    recurring_end_year: event.recurring?.endDate?.year || null,
    recurring_end_month: event.recurring?.endDate?.month || null,
    recurring_end_day: event.recurring?.endDate?.day || null,
    festival_is_multi_day: event.festivalDuration?.isMultiDay || false,
    festival_start_day: event.festivalDuration?.startDay || null,
    festival_end_day: event.festivalDuration?.endDay || null,
  };
}

/**
 * Convert database event to app format
 */
export function dbToEvent(dbEvent: DbEvent): NepaliCalendarEvent {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    nepaliDate: {
      year: dbEvent.nepali_year,
      month: dbEvent.nepali_month,
      day: dbEvent.nepali_day,
    },
    gregorianDate: {
      year: dbEvent.gregorian_year,
      month: dbEvent.gregorian_month,
      day: dbEvent.gregorian_day,
    },
    description: dbEvent.description || undefined,
    isFestival: dbEvent.is_festival,
    isLunarEvent: dbEvent.is_lunar_event,
    reminder: {
      enabled: dbEvent.reminder_enabled,
      minutesBefore: dbEvent.reminder_minutes,
    },
    recurring: dbEvent.recurring_pattern
      ? {
          pattern: dbEvent.recurring_pattern,
          endDate:
            dbEvent.recurring_end_year &&
            dbEvent.recurring_end_month &&
            dbEvent.recurring_end_day
              ? {
                  year: dbEvent.recurring_end_year,
                  month: dbEvent.recurring_end_month,
                  day: dbEvent.recurring_end_day,
                }
              : undefined,
        }
      : undefined,
    festivalDuration: dbEvent.festival_is_multi_day
      ? {
          isMultiDay: true,
          startDay: dbEvent.festival_start_day || undefined,
          endDay: dbEvent.festival_end_day || undefined,
        }
      : undefined,
  };
}

/**
 * Convert app birthday to database format
 */
export function birthdayToDb(birthday: LunarBirthday, userId: string): DbBirthdayInsert {
  return {
    id: birthday.id, // Use client-generated ID
    user_id: userId,
    name: birthday.name,
    nepali_year: birthday.nepaliDate.year,
    nepali_month: birthday.nepaliDate.month,
    nepali_day: birthday.nepaliDate.day,
    gregorian_year: birthday.gregorianBirthDate.year,
    gregorian_month: birthday.gregorianBirthDate.month,
    gregorian_day: birthday.gregorianBirthDate.day,
    is_tithi_based: birthday.isTithiBased || false,
    tithi_number: birthday.tithiNumber || null,
    reminder_enabled: birthday.reminder?.enabled || false,
    reminder_minutes: birthday.reminder?.minutesBefore || 1440,
  };
}

/**
 * Convert database birthday to app format
 */
export function dbToBirthday(dbBirthday: DbBirthday): LunarBirthday {
  return {
    id: dbBirthday.id,
    name: dbBirthday.name,
    nepaliDate: {
      year: dbBirthday.nepali_year,
      month: dbBirthday.nepali_month,
      day: dbBirthday.nepali_day,
    },
    gregorianBirthDate: {
      year: dbBirthday.gregorian_year,
      month: dbBirthday.gregorian_month,
      day: dbBirthday.gregorian_day,
    },
    reminder: {
      enabled: dbBirthday.reminder_enabled,
      minutesBefore: dbBirthday.reminder_minutes,
    },
    isTithiBased: dbBirthday.is_tithi_based,
    tithiNumber: dbBirthday.tithi_number || undefined,
  };
}

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Get or create user in database
 */
export async function getOrCreateUser(googleId: string, email: string, name?: string) {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (existingUser) {
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', existingUser.id);
    return existingUser;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      google_id: googleId,
      email,
      name: name || null,
    })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

// ============================================
// EVENT CRUD OPERATIONS
// ============================================

export async function createEvent(event: NepaliCalendarEvent, userId: string, accessToken?: string) {
  console.log('[SupabaseService.createEvent] Starting...', { eventId: event.id, userId, hasToken: !!accessToken });

  const dbEvent = eventToDb(event, userId);

  // Use passed token or try to get from session
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (!token) {
    throw new Error('No access token available');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log('[SupabaseService.createEvent] Making fetch request...');
  const response = await fetch(`${supabaseUrl}/rest/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(dbEvent)
  });

  console.log('[SupabaseService.createEvent] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SupabaseService.createEvent] Error:', errorText);
    throw new Error(`Failed to create event: ${errorText}`);
  }

  const data = await response.json();
  console.log('[SupabaseService.createEvent] Success:', data);
  return dbToEvent(Array.isArray(data) ? data[0] : data);
}

export async function getEvents(userId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(dbToEvent);
}

export async function updateEvent(eventId: string, updates: Partial<NepaliCalendarEvent>) {
  const dbUpdates: DbEventUpdate = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.nepaliDate) {
    dbUpdates.nepali_year = updates.nepaliDate.year;
    dbUpdates.nepali_month = updates.nepaliDate.month;
    dbUpdates.nepali_day = updates.nepaliDate.day;
  }
  if (updates.gregorianDate) {
    dbUpdates.gregorian_year = updates.gregorianDate.year;
    dbUpdates.gregorian_month = updates.gregorianDate.month;
    dbUpdates.gregorian_day = updates.gregorianDate.day;
  }
  if (updates.reminder) {
    dbUpdates.reminder_enabled = updates.reminder.enabled;
    dbUpdates.reminder_minutes = updates.reminder.minutesBefore;
  }
  if (updates.recurring) {
    dbUpdates.recurring_pattern = updates.recurring.pattern;
    dbUpdates.recurring_end_year = updates.recurring.endDate?.year || null;
    dbUpdates.recurring_end_month = updates.recurring.endDate?.month || null;
    dbUpdates.recurring_end_day = updates.recurring.endDate?.day || null;
  }

  const { data, error } = await supabase
    .from('events')
    .update(dbUpdates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return dbToEvent(data);
}

export async function deleteEvent(eventId: string, accessToken?: string) {
  console.log('[SupabaseService.deleteEvent] Deleting:', eventId);

  // Use passed token or try to get from session
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (!token) {
    throw new Error('No access token available');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${eventId}`, {
    method: 'DELETE',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`,
    }
  });

  console.log('[SupabaseService.deleteEvent] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SupabaseService.deleteEvent] Error:', errorText);
    throw new Error(`Failed to delete event: ${errorText}`);
  }

  console.log('[SupabaseService.deleteEvent] Success');
}

// ============================================
// BIRTHDAY CRUD OPERATIONS
// ============================================

export async function createBirthday(birthday: LunarBirthday, userId: string) {
  const dbBirthday = birthdayToDb(birthday, userId);
  const { data, error } = await supabase
    .from('birthdays')
    .insert(dbBirthday)
    .select()
    .single();

  if (error) throw error;
  return dbToBirthday(data);
}

export async function getBirthdays(userId: string) {
  const { data, error } = await supabase
    .from('birthdays')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(dbToBirthday);
}

export async function updateBirthday(birthdayId: string, updates: Partial<LunarBirthday>) {
  const dbUpdates: DbBirthdayUpdate = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.nepaliDate) {
    dbUpdates.nepali_year = updates.nepaliDate.year;
    dbUpdates.nepali_month = updates.nepaliDate.month;
    dbUpdates.nepali_day = updates.nepaliDate.day;
  }
  if (updates.gregorianBirthDate) {
    dbUpdates.gregorian_year = updates.gregorianBirthDate.year;
    dbUpdates.gregorian_month = updates.gregorianBirthDate.month;
    dbUpdates.gregorian_day = updates.gregorianBirthDate.day;
  }
  if (updates.reminder) {
    dbUpdates.reminder_enabled = updates.reminder.enabled;
    dbUpdates.reminder_minutes = updates.reminder.minutesBefore;
  }
  if (updates.isTithiBased !== undefined) dbUpdates.is_tithi_based = updates.isTithiBased;
  if (updates.tithiNumber !== undefined) dbUpdates.tithi_number = updates.tithiNumber || null;

  const { data, error } = await supabase
    .from('birthdays')
    .update(dbUpdates)
    .eq('id', birthdayId)
    .select()
    .single();

  if (error) throw error;
  return dbToBirthday(data);
}

export async function deleteBirthday(birthdayId: string, accessToken?: string) {
  console.log('[SupabaseService.deleteBirthday] ========== START ==========');
  console.log('[SupabaseService.deleteBirthday] Birthday ID:', birthdayId);
  console.log('[SupabaseService.deleteBirthday] Access token provided:', !!accessToken);

  if (!accessToken) {
    console.error('[SupabaseService.deleteBirthday] No access token provided');
    throw new Error('No access token available for deletion');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log('[SupabaseService.deleteBirthday] Making DELETE request to:', `${supabaseUrl}/rest/v1/birthdays?id=eq.${birthdayId}`);

  const response = await fetch(`${supabaseUrl}/rest/v1/birthdays?id=eq.${birthdayId}`, {
    method: 'DELETE',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  console.log('[SupabaseService.deleteBirthday] Response status:', response.status);
  console.log('[SupabaseService.deleteBirthday] Response status text:', response.statusText);

  // Log important headers
  const contentType = response.headers.get('content-type');
  const contentRange = response.headers.get('content-range');
  console.log('[SupabaseService.deleteBirthday] Response headers:', { contentType, contentRange });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SupabaseService.deleteBirthday] Error response:', errorText);

    // Try to parse error as JSON
    try {
      const errorJson = JSON.parse(errorText);
      console.error('[SupabaseService.deleteBirthday] Error details:', errorJson);
    } catch (e) {
      // Not JSON, already logged as text
    }

    throw new Error(`Failed to delete birthday: ${response.status} ${errorText}`);
  }

  const responseText = await response.text();
  console.log('[SupabaseService.deleteBirthday] Success response:', responseText);
  console.log('[SupabaseService.deleteBirthday] ========== DELETE SUCCESSFUL ==========');
}

// ============================================
// SYNC MAPPING OPERATIONS
// ============================================

export async function createSyncMapping(mapping: DbSyncMappingInsert) {
  const { data, error } = await supabase
    .from('sync_mappings')
    .insert(mapping)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSyncMappings(userId: string) {
  const { data, error } = await supabase
    .from('sync_mappings')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function deleteSyncMapping(localEventId: string, userId: string) {
  const { error } = await supabase
    .from('sync_mappings')
    .delete()
    .eq('local_event_id', localEventId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// USER SETTINGS OPERATIONS
// ============================================

export async function getUserSettings(userId: string): Promise<DbUserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is fine for new users
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateUserSettings(userId: string, updates: DbUserSettingsUpdate) {
  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertUserSettings(userId: string, settings: Omit<DbUserSettingsInsert, 'user_id'>, accessToken?: string) {
  console.log('[SupabaseService.upsertUserSettings] Starting...', { userId, hasToken: !!accessToken });

  // Use passed token or try to get from session
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (!token) {
    throw new Error('No access token available');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const settingsData = {
    user_id: userId,
    ...settings,
  };

  console.log('[SupabaseService.upsertUserSettings] Making upsert request...');
  const response = await fetch(`${supabaseUrl}/rest/v1/user_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(settingsData)
  });

  console.log('[SupabaseService.upsertUserSettings] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SupabaseService.upsertUserSettings] Error:', errorText);
    throw new Error(`Failed to upsert user settings: ${errorText}`);
  }

  const data = await response.json();
  console.log('[SupabaseService.upsertUserSettings] Success');
  return Array.isArray(data) ? data[0] : data;
}

// Helper to convert app sync config to DB format
export function syncConfigToDb(config: {
  calendarId: string;
  syncFestivals: boolean;
  syncCustomEvents: boolean;
  syncBirthdays: boolean;
  daysInAdvance: number;
  maxBirthdaysToSync: number;
  eventSyncYears: number;
}): Omit<DbUserSettingsInsert, 'user_id'> {
  return {
    calendar_id: config.calendarId,
    sync_festivals: config.syncFestivals,
    sync_custom_events: config.syncCustomEvents,
    sync_birthdays: config.syncBirthdays,
    days_in_advance: config.daysInAdvance,
    max_birthdays_to_sync: config.maxBirthdaysToSync,
    event_sync_years: config.eventSyncYears,
  };
}

// Helper to convert DB settings to app sync config
export function dbToSyncConfig(settings: DbUserSettings): {
  calendarId: string;
  syncFestivals: boolean;
  syncCustomEvents: boolean;
  syncBirthdays: boolean;
  daysInAdvance: number;
  maxBirthdaysToSync: number;
  eventSyncYears: number;
} {
  return {
    calendarId: settings.calendar_id,
    syncFestivals: settings.sync_festivals,
    syncCustomEvents: settings.sync_custom_events,
    syncBirthdays: settings.sync_birthdays,
    daysInAdvance: settings.days_in_advance,
    maxBirthdaysToSync: settings.max_birthdays_to_sync,
    eventSyncYears: settings.event_sync_years,
  };
}
