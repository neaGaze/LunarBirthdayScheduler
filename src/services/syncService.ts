/**
 * Sync Service
 * Handles synchronization between Nepali Calendar events and Google Calendar
 */

import { GoogleCalendarService } from './googleCalendarService.js';
import { NepaliEventService, type NepaliCalendarEvent } from './nepaliEventService.js';
import type { GregorianDate } from '../utils/nepaliCalendar.js';

export interface SyncConfig {
  calendarId: string;
  syncFestivals: boolean;
  syncCustomEvents: boolean;
  syncBirthdays: boolean;
  daysInAdvance: number; // Sync events N days in advance
}

export interface SyncResult {
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: string[];
}

export class SyncService {
  private googleCalendarService: GoogleCalendarService;
  private nepaliEventService: NepaliEventService;
  private syncedEventIds: Map<string, string> = new Map(); // Maps Nepali event ID to Google event ID

  constructor(
    googleCalendarService: GoogleCalendarService,
    nepaliEventService: NepaliEventService
  ) {
    this.googleCalendarService = googleCalendarService;
    this.nepaliEventService = nepaliEventService;
  }

  /**
   * Sync Nepali calendar events to Google Calendar
   */
  async syncToGoogleCalendar(config: SyncConfig): Promise<SyncResult> {
    const result: SyncResult = {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: []
    };

    try {
      // Get events to sync
      const events: NepaliCalendarEvent[] = [];

      if (config.syncFestivals) {
        const now = new Date();
        const futureDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + config.daysInAdvance
        );

        const startDate: GregorianDate = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate()
        };

        const endDate: GregorianDate = {
          year: futureDate.getFullYear(),
          month: futureDate.getMonth() + 1,
          day: futureDate.getDate()
        };

        const festivalEvents = this.nepaliEventService.getEventsForDateRange(startDate, endDate);
        events.push(...festivalEvents.filter(e => e.isFestival && config.syncFestivals));
      }

      if (config.syncCustomEvents) {
        events.push(...this.nepaliEventService.getEvents());
      }

      if (config.syncBirthdays) {
        const now = new Date();
        const birthdays = this.nepaliEventService.getUpcomingLunarBirthdays(now.getFullYear());

        // Convert birthdays to events
        birthdays.forEach(birthday => {
          events.push({
            id: birthday.id,
            title: `${birthday.name}'s Birthday`,
            nepaliDate: birthday.nepaliDate,
            gregorianDate: {
              year: new Date().getFullYear(),
              month: birthday.gregorianBirthDate.month,
              day: birthday.gregorianBirthDate.day
            },
            description: `Birthday (Nepali date: ${birthday.nepaliDate.day}/${birthday.nepaliDate.month}/${birthday.nepaliDate.year})`,
            isFestival: false,
            isLunarEvent: true,
            reminder: birthday.reminder,
            recurring: {
              pattern: 'yearly'
            }
          });
        });
      }

      // Sync each event
      for (const event of events) {
        try {
          const googleEvent = this.nepaliEventService.convertToGoogleCalendarEvent(event);
          const existingGoogleId = this.syncedEventIds.get(event.id);

          let createdEvent;
          if (existingGoogleId) {
            // Update existing event
            createdEvent = await this.googleCalendarService.updateEvent(
              config.calendarId,
              existingGoogleId,
              googleEvent
            );
          } else {
            // Create new event
            createdEvent = await this.googleCalendarService.createEvent(
              config.calendarId,
              googleEvent
            );

            if (createdEvent.id) {
              this.syncedEventIds.set(event.id, createdEvent.id);
            }
          }

          result.successCount++;
        } catch (error) {
          result.failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          result.errors.push(`Failed to sync event "${event.title}": ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(`Sync process failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Remove Nepali calendar from Google Calendar
   */
  async unsyncFromGoogleCalendar(config: SyncConfig): Promise<SyncResult> {
    const result: SyncResult = {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: []
    };

    try {
      for (const [nepaliEventId, googleEventId] of this.syncedEventIds.entries()) {
        try {
          await this.googleCalendarService.deleteEvent(config.calendarId, googleEventId);
          result.successCount++;
          this.syncedEventIds.delete(nepaliEventId);
        } catch (error) {
          result.failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          result.errors.push(`Failed to remove event ${googleEventId}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(`Unsync process failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Store synced event mappings (for persistence)
   */
  getSyncedEventMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    for (const [key, value] of this.syncedEventIds.entries()) {
      mappings[key] = value;
    }
    return mappings;
  }

  /**
   * Restore synced event mappings from storage
   */
  restoreSyncedEventMappings(mappings: Record<string, string>): void {
    this.syncedEventIds.clear();
    for (const [key, value] of Object.entries(mappings)) {
      this.syncedEventIds.set(key, value);
    }
  }
}

