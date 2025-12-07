/**
 * Migration Utility: Move localStorage data to Supabase
 * Handles events, birthdays, sync mappings, and settings
 */

import * as SupabaseService from '../services/supabaseService';
import type { NepaliCalendarEvent, LunarBirthday } from '../services/nepaliEventService';

export interface MigrationProgress {
  status: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  step: 'checking' | 'reading' | 'uploading' | 'complete';
  current: number;
  total: number;
  message: string;
  errorDetails?: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    eventsCount: number;
    birthdaysCount: number;
    syncMappingsCount: number;
  };
  errors: string[];
}

const MIGRATION_FLAG_KEY = 'nepali_calendar_migration_to_supabase_done';

/**
 * Check if user has already migrated
 */
export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Reset migration flag to allow re-migration
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}

/**
 * Get localStorage data structure
 */
function getLocalStorageData(): {
  events: NepaliCalendarEvent[];
  birthdays: LunarBirthday[];
  syncMappings: Record<string, string>;
} {
  const events: NepaliCalendarEvent[] = [];
  const birthdays: LunarBirthday[] = [];
  let syncMappings: Record<string, string> = {};

  try {
    const eventsJson = localStorage.getItem('nepali_events');
    if (eventsJson) {
      events.push(...JSON.parse(eventsJson));
    }
  } catch (e) {
    console.error('Error parsing nepali_events from localStorage:', e);
  }

  try {
    const birthdaysJson = localStorage.getItem('nepali_birthdays');
    if (birthdaysJson) {
      birthdays.push(...JSON.parse(birthdaysJson));
    }
  } catch (e) {
    console.error('Error parsing nepali_birthdays from localStorage:', e);
  }

  try {
    const mappingsJson = localStorage.getItem('nepali_calendar_sync_mappings');
    if (mappingsJson) {
      syncMappings = JSON.parse(mappingsJson);
    }
  } catch (e) {
    console.error('Error parsing sync mappings from localStorage:', e);
  }

  return { events, birthdays, syncMappings };
}

/**
 * Validate and filter events before uploading
 */
function validateEvents(events: NepaliCalendarEvent[]): NepaliCalendarEvent[] {
  return events.filter(event => {
    if (!event.title || !event.nepaliDate || !event.gregorianDate) {
      console.warn('Skipping invalid event:', event);
      return false;
    }
    return true;
  });
}

/**
 * Validate and filter birthdays before uploading
 */
function validateBirthdays(birthdays: LunarBirthday[]): LunarBirthday[] {
  return birthdays.filter(birthday => {
    if (!birthday.name || !birthday.nepaliDate || !birthday.gregorianBirthDate) {
      console.warn('Skipping invalid birthday:', birthday);
      return false;
    }
    return true;
  });
}

/**
 * Upload events to Supabase
 */
async function uploadEvents(
  userId: string,
  events: NepaliCalendarEvent[],
  onProgress: (current: number, total: number) => void,
  accessToken?: string
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let uploadedCount = 0;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  for (let i = 0; i < events.length; i++) {
    try {
      const event = events[i];
      const dbEvent = SupabaseService.eventToDb(event, userId);

      // Generate a proper UUID for the id field (DB expects UUID, not string like "event_123")
      const newId = crypto.randomUUID();
      const eventData = {
        ...dbEvent,
        id: newId  // Override with proper UUID
      };

      if (!accessToken) {
        console.error('[Migration] No access token for events!');
        errors.push(`Event "${event.title}": No access token`);
      } else {
        console.log('[Migration] Inserting event via fetch:', event.title);
        const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(eventData)
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('[Migration] Event upload error:', errorText);
          errors.push(`Event "${event.title}": ${errorText}`);
        } else {
          uploadedCount++;
        }
      }
    } catch (e) {
      console.error('[Migration] Event exception:', e);
      errors.push(`Event upload error: ${e instanceof Error ? e.message : String(e)}`);
    }

    onProgress(i + 1, events.length);
  }

  return { count: uploadedCount, errors };
}

/**
 * Upload birthdays to Supabase
 */
async function uploadBirthdays(
  userId: string,
  birthdays: LunarBirthday[],
  onProgress: (current: number, total: number) => void,
  accessToken?: string
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let uploadedCount = 0;

  console.log('[Migration] uploadBirthdays called with userId:', userId, 'birthdays count:', birthdays.length);

  if (birthdays.length === 0) {
    console.log('[Migration] No birthdays to upload');
    return { count: 0, errors: [] };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // First, fetch existing birthdays to avoid duplicates
  let existingBirthdays: Set<string> = new Set();
  try {
    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/birthdays?user_id=eq.${userId}&select=name,nepali_month,nepali_day`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      // Create a key from name + date to check duplicates
      existingBirthdays = new Set(existing.map((b: { name: string; nepali_month: number; nepali_day: number }) =>
        `${b.name}_${b.nepali_month}_${b.nepali_day}`
      ));
      console.log('[Migration] Found', existingBirthdays.size, 'existing birthdays');
    }
  } catch (e) {
    console.warn('[Migration] Could not fetch existing birthdays:', e);
  }

  for (let i = 0; i < birthdays.length; i++) {
    const birthday = birthdays[i];
    console.log('[Migration] Processing birthday', i + 1, ':', birthday.name);

    // Check for duplicate
    const birthdayKey = `${birthday.name}_${birthday.nepaliDate.month}_${birthday.nepaliDate.day}`;
    if (existingBirthdays.has(birthdayKey)) {
      console.log('[Migration] Skipping duplicate birthday:', birthday.name);
      onProgress(i + 1, birthdays.length);
      continue;
    }

    try {
      const dbBirthday = SupabaseService.birthdayToDb(birthday, userId);

      // Generate a proper UUID for the id field (DB expects UUID, not string like "birthday_123")
      const newId = crypto.randomUUID();
      const birthdayData = {
        ...dbBirthday,
        id: newId  // Override with proper UUID
      };
      console.log('[Migration] Converted to DB with new UUID:', { id: newId, name: birthdayData.name });

      if (!accessToken) {
        console.error('[Migration] No access token available!');
        errors.push(`Birthday "${birthday.name}": No access token`);
      } else {
        try {
          console.log('[Migration] Inserting birthday via fetch...');
          const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/birthdays`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(birthdayData)
          });

          console.log('[Migration] Fetch response status:', fetchResponse.status);

          if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('[Migration] Fetch error:', errorText);
            errors.push(`Birthday "${birthday.name}": ${errorText}`);
          } else {
            console.log('[Migration] Success!');
            uploadedCount++;
          }
        } catch (fetchError) {
          console.error('[Migration] Fetch exception:', fetchError);
          errors.push(`Birthday "${birthday.name}": ${fetchError}`);
        }
      }

      console.log('[Migration] Insert done');
    } catch (e) {
      console.error('[Migration] Exception:', e);
      errors.push(`Birthday error: ${e instanceof Error ? e.message : String(e)}`);
    }

    onProgress(i + 1, birthdays.length);
  }

  console.log('[Migration] uploadBirthdays done. Uploaded:', uploadedCount, 'Errors:', errors.length);
  return { count: uploadedCount, errors };
}

/**
 * Upload sync mappings to Supabase
 * NOTE: Sync mappings use string IDs locally but DB expects UUID for local_event_id
 * Skipping for now - these can be recreated when user syncs to Google Calendar
 */
async function uploadSyncMappings(
  _userId: string,
  mappings: Record<string, string>,
  _accessToken?: string
): Promise<{ count: number; errors: string[] }> {
  // Skip sync mappings migration - they use string IDs that don't match DB UUID type
  // These will be recreated when user syncs events to Google Calendar
  console.log('[Migration] Skipping sync mappings (will be recreated on next Google Calendar sync)');
  console.log('[Migration] Would have migrated', Object.keys(mappings).length, 'mappings');
  return { count: 0, errors: [] };
}

/**
 * Main migration function
 * Migrates all localStorage data to Supabase
 * @param onProgress - Progress callback
 * @param userId - User ID (optional, will be fetched from session if not provided)
 * @param force - Force re-migration even if already done
 * @param accessToken - Access token for authenticated requests
 */
export async function migrateToSupabase(
  onProgress?: (progress: MigrationProgress) => void,
  userId?: string,
  force: boolean = false,
  accessToken?: string
): Promise<MigrationResult> {
  const updateProgress = (progress: MigrationProgress) => {
    onProgress?.(progress);
  };

  try {
    // Check if already migrated (skip if force=true)
    if (!force && isMigrationDone()) {
      return {
        success: true,
        message: 'Already migrated to Supabase',
        stats: { eventsCount: 0, birthdaysCount: 0, syncMappingsCount: 0 },
        errors: []
      };
    }

    // Get authenticated user - userId must be passed from caller
    const currentUserId = userId;
    if (!currentUserId) {
      throw new Error('Migration requires authentication. User ID must be provided.');
    }

    if (!accessToken) {
      throw new Error('Migration requires authentication. Access token must be provided.');
    }
    const errors: string[] = [];

    // Step 1: Check and read localStorage
    updateProgress({
      status: 'loading',
      step: 'checking',
      current: 0,
      total: 1,
      message: 'Checking localStorage data...'
    });

    const { events, birthdays, syncMappings } = getLocalStorageData();
    const validEvents = validateEvents(events);
    const validBirthdays = validateBirthdays(birthdays);

    console.log('[Migration] Data found:', {
      events: validEvents.length,
      birthdays: validBirthdays.length,
      syncMappings: Object.keys(syncMappings).length
    });

    updateProgress({
      status: 'processing',
      step: 'reading',
      current: 1,
      total: 3,
      message: `Found ${validEvents.length} events, ${validBirthdays.length} birthdays`
    });

    // Step 2: Upload events
    updateProgress({
      status: 'processing',
      step: 'uploading',
      current: 0,
      total: validEvents.length,
      message: 'Uploading events...'
    });

    console.log('[Migration] Uploading events...');
    const eventsResult = await uploadEvents(currentUserId, validEvents, (current, total) => {
      updateProgress({
        status: 'processing',
        step: 'uploading',
        current,
        total,
        message: `Uploading events (${current}/${total})...`
      });
    }, accessToken);
    console.log('[Migration] Events result:', eventsResult);

    errors.push(...eventsResult.errors);

    // Step 3: Upload birthdays
    updateProgress({
      status: 'processing',
      step: 'uploading',
      current: 0,
      total: validBirthdays.length,
      message: 'Uploading birthdays...'
    });

    console.log('[Migration] Uploading birthdays...');
    const birthdaysResult = await uploadBirthdays(currentUserId, validBirthdays, (current, total) => {
      updateProgress({
        status: 'processing',
        step: 'uploading',
        current,
        total,
        message: `Uploading birthdays (${current}/${total})...`
      });
    }, accessToken);
    console.log('[Migration] Birthdays result:', birthdaysResult);

    errors.push(...birthdaysResult.errors);

    // Step 4: Upload sync mappings
    updateProgress({
      status: 'processing',
      step: 'uploading',
      current: 0,
      total: 1,
      message: 'Uploading sync mappings...'
    });

    console.log('[Migration] Uploading sync mappings...');
    const mappingsResult = await uploadSyncMappings(currentUserId, syncMappings, accessToken);
    console.log('[Migration] Sync mappings result:', mappingsResult);
    errors.push(...mappingsResult.errors);

    // Mark migration as done
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    const stats = {
      eventsCount: eventsResult.count,
      birthdaysCount: birthdaysResult.count,
      syncMappingsCount: mappingsResult.count
    };

    console.log('[Migration] Complete!', { stats, errors });

    updateProgress({
      status: 'success',
      step: 'complete',
      current: 1,
      total: 1,
      message: `Done! ${stats.eventsCount} events, ${stats.birthdaysCount} birthdays synced.`
    });

    return {
      success: errors.length === 0,
      message: errors.length === 0
        ? `Migration successful! Uploaded ${stats.eventsCount} events, ${stats.birthdaysCount} birthdays, and ${stats.syncMappingsCount} sync mappings.`
        : `Migration completed with ${errors.length} error(s). Some data may not have been migrated.`,
      stats,
      errors
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);

    updateProgress({
      status: 'error',
      step: 'uploading',
      current: 0,
      total: 1,
      message: 'Migration failed',
      errorDetails: errorMsg
    });

    return {
      success: false,
      message: `Migration failed: ${errorMsg}`,
      stats: { eventsCount: 0, birthdaysCount: 0, syncMappingsCount: 0 },
      errors: [errorMsg]
    };
  }
}
