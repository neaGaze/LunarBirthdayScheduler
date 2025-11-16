/**
 * Migration Utility: Move localStorage data to Supabase
 * Handles events, birthdays, sync mappings, and settings
 */

import { supabase } from '../services/supabaseClient';
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
  onProgress: (current: number, total: number) => void
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let uploadedCount = 0;

  for (let i = 0; i < events.length; i++) {
    try {
      const event = events[i];
      const dbEvent = SupabaseService.eventToDb(event, userId);

      const { error } = await supabase
        .from('events')
        .insert([dbEvent]);

      if (error) {
        errors.push(`Event "${event.title}": ${error.message}`);
      } else {
        uploadedCount++;
      }
    } catch (e) {
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
  onProgress: (current: number, total: number) => void
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let uploadedCount = 0;

  for (let i = 0; i < birthdays.length; i++) {
    try {
      const birthday = birthdays[i];
      const dbBirthday = SupabaseService.birthdayToDb(birthday, userId);

      const { error } = await supabase
        .from('birthdays')
        .insert([dbBirthday]);

      if (error) {
        errors.push(`Birthday "${birthday.name}": ${error.message}`);
      } else {
        uploadedCount++;
      }
    } catch (e) {
      errors.push(`Birthday upload error: ${e instanceof Error ? e.message : String(e)}`);
    }

    onProgress(i + 1, birthdays.length);
  }

  return { count: uploadedCount, errors };
}

/**
 * Upload sync mappings to Supabase
 */
async function uploadSyncMappings(
  userId: string,
  mappings: Record<string, string>
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let uploadedCount = 0;

  try {
    // Check if user already has sync mappings
    const { data: existing, error: fetchError } = await supabase
      .from('sync_mappings')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      errors.push(`Error checking existing mappings: ${fetchError.message}`);
      return { count: 0, errors };
    }

    const existingMap = new Map(existing?.map(m => [m.event_id, m.google_event_id]) || []);

    for (const [eventId, googleEventId] of Object.entries(mappings)) {
      try {
        if (existingMap.has(eventId)) {
          // Update existing mapping
          const { error } = await supabase
            .from('sync_mappings')
            .update({ google_event_id: googleEventId })
            .eq('user_id', userId)
            .eq('event_id', eventId);

          if (error) {
            errors.push(`Update mapping "${eventId}": ${error.message}`);
          } else {
            uploadedCount++;
          }
        } else {
          // Insert new mapping
          const { error } = await supabase
            .from('sync_mappings')
            .insert([{
              user_id: userId,
              event_id: eventId,
              google_event_id: googleEventId
            }]);

          if (error) {
            errors.push(`Insert mapping "${eventId}": ${error.message}`);
          } else {
            uploadedCount++;
          }
        }
      } catch (e) {
        errors.push(`Mapping error for "${eventId}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`Sync mappings upload error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { count: uploadedCount, errors };
}

/**
 * Main migration function
 * Migrates all localStorage data to Supabase
 */
export async function migrateToSupabase(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const updateProgress = (progress: MigrationProgress) => {
    onProgress?.(progress);
  };

  try {
    // Check if already migrated
    if (isMigrationDone()) {
      return {
        success: true,
        message: 'Already migrated to Supabase',
        stats: { eventsCount: 0, birthdaysCount: 0, syncMappingsCount: 0 },
        errors: []
      };
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated. Please log in with Supabase first.');
    }

    const userId = user.id;
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

    const eventsResult = await uploadEvents(userId, validEvents, (current, total) => {
      updateProgress({
        status: 'processing',
        step: 'uploading',
        current,
        total,
        message: `Uploading events (${current}/${total})...`
      });
    });

    errors.push(...eventsResult.errors);

    // Step 3: Upload birthdays
    updateProgress({
      status: 'processing',
      step: 'uploading',
      current: 0,
      total: validBirthdays.length,
      message: 'Uploading birthdays...'
    });

    const birthdaysResult = await uploadBirthdays(userId, validBirthdays, (current, total) => {
      updateProgress({
        status: 'processing',
        step: 'uploading',
        current,
        total,
        message: `Uploading birthdays (${current}/${total})...`
      });
    });

    errors.push(...birthdaysResult.errors);

    // Step 4: Upload sync mappings
    updateProgress({
      status: 'processing',
      step: 'uploading',
      current: 0,
      total: 1,
      message: 'Uploading sync mappings...'
    });

    const mappingsResult = await uploadSyncMappings(userId, syncMappings);
    errors.push(...mappingsResult.errors);

    // Mark migration as done
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    updateProgress({
      status: 'success',
      step: 'complete',
      current: 1,
      total: 1,
      message: 'Migration complete!'
    });

    const stats = {
      eventsCount: eventsResult.count,
      birthdaysCount: birthdaysResult.count,
      syncMappingsCount: mappingsResult.count
    };

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
