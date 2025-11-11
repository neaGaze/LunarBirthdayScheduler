/**
 * Nepali Event Service
 * Handles Nepali calendar events, festivals, and custom events
 */

import {
  gregorianToNepali,
  nepaliToGregorian,
  NEPALI_FESTIVALS,
  NEPALI_MONTH_NAMES,
  type GregorianDate,
  type NepaliDate
} from '../utils/nepaliCalendar.js';
import type { CalendarEvent } from './googleCalendarService.js';

export interface NepaliCalendarEvent {
  id: string;
  title: string;
  nepaliDate: NepaliDate;
  gregorianDate: GregorianDate;
  description?: string;
  isFestival: boolean;
  isLunarEvent: boolean;
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
  recurring?: {
    pattern: 'yearly' | 'monthly';
    endDate?: NepaliDate;
  };
}

export interface LunarBirthday {
  id: string;
  name: string;
  nepaliDate: NepaliDate;
  gregorianBirthDate: GregorianDate;
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
  // Tithi-based birthday support
  isTithiBased?: boolean;
  tithiNumber?: number; // 1-30, the lunar day to celebrate on
}

export class NepaliEventService {
  private nepaliEvents: Map<string, NepaliCalendarEvent> = new Map();
  private lunarBirthdays: Map<string, LunarBirthday> = new Map();
  private festivals: NepaliCalendarEvent[] = [];

  constructor() {
    this.initializeFestivals();
  }

  /**
   * Initialize major festivals
   */
  private initializeFestivals(): void {
    const monthNameToNumber: { [key: string]: number } = {
      'Baisakh': 1,
      'Jestha': 2,
      'Asar': 3,
      'Shrawan': 4,
      'Bhadra': 5,
      'Ashwin': 6,
      'Kartik': 7,
      'Mangsir': 8,
      'Poush': 9,
      'Magh': 10,
      'Falgun': 11,
      'Chaitra': 12,
      'Ashoj': 6  // Ashoj is another name for Ashwin
    };

    NEPALI_FESTIVALS.forEach((festival, index) => {
      const eventId = `festival_${index}`;
      const monthNumber = monthNameToNumber[festival.month] || (index + 1);

      // Assuming month numbers map to festivals
      const nepaliDate: NepaliDate = {
        year: 2080,
        month: monthNumber,
        day: festival.day || 1
      };

      const gregorianDate = nepaliToGregorian(nepaliDate);

      this.festivals.push({
        id: eventId,
        title: festival.name,
        nepaliDate,
        gregorianDate,
        description: `Nepali festival: ${festival.name}`,
        isFestival: true,
        isLunarEvent: festival.isLunar,
        reminder: {
          enabled: true,
          minutesBefore: 1440 // 1 day before
        },
        recurring: {
          pattern: 'yearly'
        }
      });
    });
  }

  /**
   * Get all major festivals
   */
  getFestivals(nepaliYear?: number): NepaliCalendarEvent[] {
    // If no year specified, use the current Nepali year
    const currentGregorian = new Date();
    const currentNepaliDate = gregorianToNepali({
      year: currentGregorian.getFullYear(),
      month: currentGregorian.getMonth() + 1,
      day: currentGregorian.getDate()
    });
    const yearToUse = nepaliYear || currentNepaliDate.year;

    return this.festivals.map(festival => ({
      ...festival,
      nepaliDate: { ...festival.nepaliDate, year: yearToUse },
      gregorianDate: nepaliToGregorian({ ...festival.nepaliDate, year: yearToUse })
    }));
  }

  /**
   * Add a custom Nepali event
   */
  addEvent(event: Omit<NepaliCalendarEvent, 'id' | 'gregorianDate'>): NepaliCalendarEvent {
    const id = `event_${Date.now()}`;
    const gregorianDate = nepaliToGregorian(event.nepaliDate);

    const newEvent: NepaliCalendarEvent = {
      ...event,
      id,
      gregorianDate
    };

    this.nepaliEvents.set(id, newEvent);
    return newEvent;
  }

  /**
   * Get all custom events
   */
  getEvents(): NepaliCalendarEvent[] {
    return Array.from(this.nepaliEvents.values());
  }

  /**
   * Update an event
   */
  updateEvent(id: string, updates: Partial<NepaliCalendarEvent>): NepaliCalendarEvent | null {
    const event = this.nepaliEvents.get(id);
    if (!event) return null;

    const updated: NepaliCalendarEvent = {
      ...event,
      ...updates,
      id: event.id // Prevent ID changes
    };

    // Recalculate Gregorian date if Nepali date changed
    if (updates.nepaliDate) {
      updated.gregorianDate = nepaliToGregorian(updated.nepaliDate);
    }

    this.nepaliEvents.set(id, updated);
    return updated;
  }

  /**
   * Delete an event
   */
  deleteEvent(id: string): boolean {
    return this.nepaliEvents.delete(id);
  }

  /**
   * Add a lunar birthday
   */
  addLunarBirthday(birthday: Omit<LunarBirthday, 'id'>): LunarBirthday {
    const id = `birthday_${Date.now()}`;
    const newBirthday: LunarBirthday = {
      ...birthday,
      id
    };

    this.lunarBirthdays.set(id, newBirthday);
    return newBirthday;
  }

  /**
   * Get all lunar birthdays
   */
  getLunarBirthdays(): LunarBirthday[] {
    return Array.from(this.lunarBirthdays.values());
  }

  /**
   * Get upcoming lunar birthdays for a year
   * Returns all birthdays that have a gregorian birth date occurring in the given year
   */
  getUpcomingLunarBirthdays(gregorianYear: number): LunarBirthday[] {
    return this.getLunarBirthdays().filter(birthday => {
      // Check if the gregorian birth date's month/day occurs in this year
      // We use the gregorianBirthDate directly since it's the actual date of birth
      // and it recurs on the same month/day every year
      return birthday.gregorianBirthDate.month >= 1 && birthday.gregorianBirthDate.month <= 12;
    });
  }

  /**
   * Update a lunar birthday
   */
  updateLunarBirthday(id: string, updates: Partial<LunarBirthday>): LunarBirthday | null {
    const birthday = this.lunarBirthdays.get(id);
    if (!birthday) return null;

    const updated: LunarBirthday = {
      ...birthday,
      ...updates,
      id: birthday.id
    };

    this.lunarBirthdays.set(id, updated);
    return updated;
  }

  /**
   * Delete a lunar birthday
   */
  deleteLunarBirthday(id: string): boolean {
    return this.lunarBirthdays.delete(id);
  }

  /**
   * Convert NepaliCalendarEvent to Google Calendar Event
   */
  convertToGoogleCalendarEvent(event: NepaliCalendarEvent): CalendarEvent {
    const { year, month, day } = event.gregorianDate;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // For all-day events, end date should be the next day
    // Create a proper date object and add 1 day
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    const endDateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    console.log('Date conversion details:', {
      input: { year, month, day },
      startDateString: dateString,
      startDateObj: startDate.toISOString(),
      endDateString: endDateString,
      endDateObj: endDate.toISOString(),
      startMonth: startDate.getMonth() + 1,
      endMonth: endDate.getMonth() + 1
    });

    // Build description with Nepali date information
    const nepaliMonth = NEPALI_MONTH_NAMES[event.nepaliDate.month - 1] || `Month ${event.nepaliDate.month}`;
    const descriptionParts: string[] = [];
    descriptionParts.push(`Nepali Date: ${nepaliMonth} ${event.nepaliDate.day}, ${event.nepaliDate.year} (BS)`);

    if (event.description) {
      descriptionParts.push(event.description);
    }

    // Add festival/event/birthday indicator
    if (event.isFestival) {
      descriptionParts.push('This is a Nepali Festival');
    } else if (event.isLunarEvent) {
      descriptionParts.push('This is a Lunar Calendar Event');
    }

    const fullDescription = descriptionParts.join('\n');

    // Google Calendar API expects start/end with specific format
    // For all-day events, use 'date' field only (YYYY-MM-DD format)
    // and end date should be the next day
    const googleEvent: CalendarEvent = {
      summary: event.title,
      start: {
        date: dateString
      },
      end: {
        date: endDateString
      }
    };

    // MINIMAL TEST MODE - only send summary and dates
    const minimalTestMode = false;

    if (!minimalTestMode) {
      // Only add description if it exists
      if (fullDescription && fullDescription.trim()) {
        googleEvent.description = fullDescription;
      }

      // Only add recurrence if it exists
      if (event.recurring) {
        const freq = event.recurring.pattern === 'yearly' ? 'YEARLY' : 'MONTHLY';
        googleEvent.recurrence = [`RRULE:FREQ=${freq}`];
      }

      // Only add reminders if they exist and are enabled
      if (event.reminder && event.reminder.enabled === true) {
        googleEvent.reminders = {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: event.reminder.minutesBefore || 1440
            }
          ]
        };
      }
    }

    console.log('Converted Google event:', googleEvent);
    return googleEvent;
  }

  /**
   * Get events for a specific date range
   */
  getEventsForDateRange(startDate: GregorianDate, endDate: GregorianDate): NepaliCalendarEvent[] {
    const events = [...this.nepaliEvents.values(), ...this.festivals];

    return events.filter(event => {
      const eventDate = event.gregorianDate;
      const isAfterStart =
        eventDate.year > startDate.year ||
        (eventDate.year === startDate.year && eventDate.month > startDate.month) ||
        (eventDate.year === startDate.year &&
          eventDate.month === startDate.month &&
          eventDate.day >= startDate.day);

      const isBeforeEnd =
        eventDate.year < endDate.year ||
        (eventDate.year === endDate.year && eventDate.month < endDate.month) ||
        (eventDate.year === endDate.year &&
          eventDate.month === endDate.month &&
          eventDate.day <= endDate.day);

      return isAfterStart && isBeforeEnd;
    });
  }
}

