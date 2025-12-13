/**
 * Sync Service
 * Handles synchronization between Nepali Calendar events and Google Calendar
 */

import { GoogleCalendarService } from './googleCalendarService.js';
import { NepaliEventService, type NepaliCalendarEvent } from './nepaliEventService.js';
import type { GregorianDate } from '../utils/nepaliCalendar.js';
import { calculateTithi, gregorianToNepali, nepaliToGregorian } from '../utils/nepaliCalendar.js';

export interface SyncConfig {
  calendarId: string;
  syncFestivals: boolean;
  syncCustomEvents: boolean;
  syncBirthdays: boolean;
  daysInAdvance: number; // Sync events N days in advance
  maxBirthdaysToSync: number; // Max future lunar birthday occurrences to sync
  eventSyncYears: number; // Number of years to sync custom events for
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
  private readonly SYNC_MAPPINGS_KEY = 'nepali_calendar_sync_mappings';

  constructor(
    googleCalendarService: GoogleCalendarService,
    nepaliEventService: NepaliEventService
  ) {
    this.googleCalendarService = googleCalendarService;
    this.nepaliEventService = nepaliEventService;
    this.loadSyncMappings();
  }

  /**
   * Find the next date with a specific tithi (lunar day)
   * @param startDate Starting date to search from
   * @param targetTithiNumber The tithi number to find (1-30)
   * @returns The next date that has the target tithi
   */
  private findNextTithiDate(startDate: GregorianDate, targetTithiNumber: number): GregorianDate {
    let currentDate = new Date(startDate.year, startDate.month - 1, startDate.day);

    // Search for up to 60 days to find the tithi
    for (let i = 0; i < 60; i++) {
      const checkDate: GregorianDate = {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate()
      };

      const tithi = calculateTithi(checkDate);
      if (tithi.number === targetTithiNumber) {
        return checkDate;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fallback to the start date if tithi not found
    return startDate;
  }

  /**
   * Get day of year (1-366) for a date
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Find the lunar birthday occurrence for a specific solar year
   *
   * IMPORTANT: Tithis repeat every ~29.5 days (each lunar month).
   * A "lunar birthday" is celebrated ONCE per SOLAR YEAR on the tithi
   * that falls just BEFORE the original birth date's position in the year.
   *
   * This matches the algorithm used in BirthdayTracker component.
   *
   * @param year The year to search in
   * @param targetTithiNumber The tithi number to find (1-30)
   * @param originalBirthDayOfYear The day-of-year of the original birth date (e.g., June 26 = day 177)
   * @returns The date in that year with the target tithi that comes before the birth day-of-year
   */
  private findTithiBirthdayForYear(
    year: number,
    targetTithiNumber: number,
    originalBirthDayOfYear: number
  ): GregorianDate {
    const tithiOccurrences: Date[] = [];

    // Search through the entire year
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const checkDate: GregorianDate = {
          year: year,
          month: month,
          day: day
        };

        const tithi = calculateTithi(checkDate);

        if (tithi.number === targetTithiNumber) {
          tithiOccurrences.push(new Date(year, month - 1, day));
        }
      }
    }

    if (tithiOccurrences.length === 0) {
      // Fallback: return Jan 1 of the year
      return { year, month: 1, day: 1 };
    }

    // Find the occurrence that comes BEFORE the original birth day-of-year
    // This is the last occurrence where dayOfYear < originalBirthDayOfYear
    let bestOccurrence: Date | null = null;
    let bestDayOfYear = -1;

    for (const occurrence of tithiOccurrences) {
      const dayOfYear = this.getDayOfYear(occurrence);

      // We want the occurrence that's before the original day but as close as possible
      if (dayOfYear < originalBirthDayOfYear && dayOfYear > bestDayOfYear) {
        bestDayOfYear = dayOfYear;
        bestOccurrence = occurrence;
      }
    }

    if (bestOccurrence) {
      return {
        year: bestOccurrence.getFullYear(),
        month: bestOccurrence.getMonth() + 1,
        day: bestOccurrence.getDate()
      };
    }

    // If no occurrence found before the target day, fall back to the last occurrence of the year
    // (This handles edge cases where all occurrences are after the birth date)
    const lastOccurrence = tithiOccurrences[tithiOccurrences.length - 1];
    return {
      year: lastOccurrence.getFullYear(),
      month: lastOccurrence.getMonth() + 1,
      day: lastOccurrence.getDate()
    };
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
        const customEvents = this.nepaliEventService.getEvents();
        const currentYear = new Date().getFullYear();
        const yearsToSync = config.eventSyncYears || 1;

        customEvents.forEach(event => {
          // For each custom event, create entries for N years
          for (let yearOffset = 0; yearOffset < yearsToSync; yearOffset++) {
            const targetYear = currentYear + yearOffset;

            // Calculate the Gregorian date for this year based on Nepali date
            // We need to find what Gregorian date corresponds to this Nepali date in the target year
            const nepaliYearOffset = targetYear - (event.gregorianDate?.year || currentYear);
            const targetNepaliYear = event.nepaliDate.year + nepaliYearOffset;

            const targetNepaliDate = {
              year: targetNepaliYear,
              month: event.nepaliDate.month,
              day: event.nepaliDate.day
            };

            // Convert to Gregorian
            let targetGregorianDate: GregorianDate;
            try {
              targetGregorianDate = nepaliToGregorian(targetNepaliDate);
            } catch {
              // If conversion fails, skip this year
              continue;
            }

            // Skip past dates
            const eventDate = new Date(targetGregorianDate.year, targetGregorianDate.month - 1, targetGregorianDate.day);
            if (eventDate < new Date()) {
              continue;
            }

            // Create unique ID for each year's event
            const eventId = yearsToSync > 1 ? `${event.id}_${targetYear}` : event.id;

            events.push({
              ...event,
              id: eventId,
              nepaliDate: targetNepaliDate,
              gregorianDate: targetGregorianDate
            });
          }
        });
      }

      if (config.syncBirthdays) {
        console.log('========== SYNCING BIRTHDAYS - START ==========');
        const now = new Date();
        const currentYear = now.getFullYear();
        const birthdays = this.nepaliEventService.getUpcomingLunarBirthdays(currentYear);
        console.log(`Found ${birthdays.length} birthdays to sync`);

        // Convert birthdays to events
        birthdays.forEach((birthday, index) => {
          console.log(`Processing birthday ${index + 1}: ${birthday.name}, isTithiBased: ${birthday.isTithiBased}, tithiNumber: ${birthday.tithiNumber}`);
          if (birthday.isTithiBased && birthday.tithiNumber) {
            console.log('  --> This is a TITHI-BASED birthday');
            // For tithi-based birthdays, create individual events for next 10 years
            // (since the date changes each year based on lunar calendar)
            const originalBirthDate = new Date(
              birthday.gregorianBirthDate.year,
              birthday.gregorianBirthDate.month - 1,
              birthday.gregorianBirthDate.day
            );
            const originalBirthDayOfYear = this.getDayOfYear(originalBirthDate);

            // Create events for the next N future occurrences (from config)
            let eventsCreated = 0;
            for (let yearOffset = 0; yearOffset < 10 && eventsCreated < config.maxBirthdaysToSync; yearOffset++) {
              const targetYear = currentYear + yearOffset;

              const gregorianDate = this.findTithiBirthdayForYear(
                targetYear,
                birthday.tithiNumber,
                originalBirthDayOfYear
              );

              console.log(`[Sync] Year ${targetYear}: Found tithi ${birthday.tithiNumber} on ${gregorianDate.month}/${gregorianDate.day}/${gregorianDate.year} (original birth day-of-year: ${originalBirthDayOfYear})`);

              // Skip if this date has already passed
              const birthdayDate = new Date(gregorianDate.year, gregorianDate.month - 1, gregorianDate.day);
              if (birthdayDate < now) {
                console.log(`[Sync] Skipping ${gregorianDate.year} - date has passed`);
                continue;
              }

              console.log(`[Sync] Creating event ${eventsCreated + 1}/${config.maxBirthdaysToSync} for sync`);

              // Convert the calculated Gregorian date to Nepali date
              const nepaliDate = gregorianToNepali(gregorianDate);

              // Build description
              const birthNepaliDateStr = `${birthday.nepaliDate.day}/${birthday.nepaliDate.month}/${birthday.nepaliDate.year}`;
              const celebrationNepaliDateStr = `${nepaliDate.day}/${nepaliDate.month}/${nepaliDate.year}`;
              const description = `Born: ${birthNepaliDateStr} (BS)\nCelebrating on: ${celebrationNepaliDateStr} (BS) (Tithi ${birthday.tithiNumber})`;

              // Create a unique ID for each year's event
              const eventId = `${birthday.id}_${targetYear}`;

              events.push({
                id: eventId,
                title: `${birthday.name}'s LUNAR BIRTHDAY`,
                nepaliDate: nepaliDate,
                gregorianDate,
                description: description,
                isFestival: false,
                isLunarEvent: true,
                reminder: {
                  enabled: true,
                  minutesBefore: 1440  // Default 1 day before
                },
                // NO recurring pattern - this is a single event
              });

              eventsCreated++;
            }
            console.log(`[Sync] Total lunar birthday events created: ${eventsCreated}`);
          } else {
            // For date-based birthdays, use yearly recurrence (date is the same every year)
            let year = currentYear;
            const birthdayThisYear = new Date(currentYear, birthday.gregorianBirthDate.month - 1, birthday.gregorianBirthDate.day);

            // If birthday has passed this year, use next year
            if (birthdayThisYear < now) {
              year = currentYear + 1;
            }

            const gregorianDate = {
              year: year,
              month: birthday.gregorianBirthDate.month,
              day: birthday.gregorianBirthDate.day
            };

            const nepaliDate = gregorianToNepali(gregorianDate);

            const birthNepaliDateStr = `${birthday.nepaliDate.day}/${birthday.nepaliDate.month}/${birthday.nepaliDate.year}`;
            const celebrationNepaliDateStr = `${nepaliDate.day}/${nepaliDate.month}/${nepaliDate.year}`;
            const description = `Born: ${birthNepaliDateStr} (BS)\nCelebrating on: ${celebrationNepaliDateStr} (BS)`;

            events.push({
              id: birthday.id,
              title: `${birthday.name}'s BIRTHDAY`,
              nepaliDate: nepaliDate,
              gregorianDate,
              description: description,
              isFestival: false,
              isLunarEvent: true,
              reminder: {
                enabled: true,
                minutesBefore: 1440
              },
              recurring: {
                pattern: 'yearly'  // Date-based birthdays can use yearly recurrence
              }
            });
          }
        });
      }

      // Sync each event
      for (const event of events) {
        try {
          console.log(`[Sync] Processing event: ${event.id} - ${event.title}`);
          const googleEvent = this.nepaliEventService.convertToGoogleCalendarEvent(event);
          const existingGoogleId = this.syncedEventIds.get(event.id);
          console.log(`[Sync] Existing Google ID for ${event.id}:`, existingGoogleId);

          let createdEvent;
          if (existingGoogleId) {
            // Update existing event
            console.log(`[Sync] Updating existing event...`);
            createdEvent = await this.googleCalendarService.updateEvent(
              config.calendarId,
              existingGoogleId,
              googleEvent
            );
          } else {
            // Create new event
            console.log(`[Sync] Creating new event...`);
            createdEvent = await this.googleCalendarService.createEvent(
              config.calendarId,
              googleEvent
            );
            console.log(`[Sync] Created event with Google ID:`, createdEvent.id);

            if (createdEvent.id) {
              this.syncedEventIds.set(event.id, createdEvent.id);
              console.log(`[Sync] Saved mapping: ${event.id} -> ${createdEvent.id}`);
            }
          }

          result.successCount++;
        } catch (error) {
          result.failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          result.errors.push(`Failed to sync event "${event.title}": ${errorMessage}`);
          console.error(`[Sync] Error syncing event ${event.id}:`, errorMessage);
        }
      }

      // Save mappings to localStorage after syncing
      console.log('[Sync] Saving mappings to localStorage...');
      console.log('[Sync] Current mappings:', this.getSyncedEventMappings());
      this.saveSyncMappings();
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

      // Save mappings to localStorage after unsyncing
      this.saveSyncMappings();
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

  /**
   * Save synced event mappings to localStorage
   */
  private saveSyncMappings(): void {
    try {
      const mappings = this.getSyncedEventMappings();
      localStorage.setItem(this.SYNC_MAPPINGS_KEY, JSON.stringify(mappings));
    } catch (error) {
      console.error('Failed to save sync mappings to localStorage:', error);
    }
  }

  /**
   * Load synced event mappings from localStorage
   */
  private loadSyncMappings(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_MAPPINGS_KEY);
      if (stored) {
        const mappings = JSON.parse(stored);
        this.restoreSyncedEventMappings(mappings);
      }
    } catch (error) {
      console.error('Failed to load sync mappings from localStorage:', error);
    }
  }

  /**
   * Get Google Calendar event ID for a Nepali event
   */
  getSyncedGoogleEventId(nepaliEventId: string): string | undefined {
    return this.syncedEventIds.get(nepaliEventId);
  }
}

