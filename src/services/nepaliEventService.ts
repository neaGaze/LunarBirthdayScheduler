/**
 * Nepali Event Service
 * Handles Nepali calendar events, festivals, and custom events
 */

import {
  gregorianToNepali,
  nepaliToGregorian,
  NEPALI_FESTIVALS,
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
    NEPALI_FESTIVALS.forEach((festival, index) => {
      const eventId = `festival_${index}`;
      // Assuming month numbers map to festivals
      const nepaliDate: NepaliDate = {
        year: 2080,
        month: index + 1,
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
    return this.festivals.map(festival => ({
      ...festival,
      nepaliDate: nepaliYear
        ? { ...festival.nepaliDate, year: nepaliYear }
        : festival.nepaliDate
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
   */
  getUpcomingLunarBirthdays(gregorianYear: number): LunarBirthday[] {
    return this.getLunarBirthdays().filter(birthday => {
      // Calculate if birthday occurs in the given year
      const nextOccurrence = nepaliToGregorian({
        year: gregorianToNepali({ year: gregorianYear, month: 1, day: 1 }).year,
        month: birthday.nepaliDate.month,
        day: birthday.nepaliDate.day
      });

      return nextOccurrence.year === gregorianYear;
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

    return {
      summary: event.title,
      description: event.description,
      start: {
        date: dateString
      },
      end: {
        date: dateString
      },
      reminders: event.reminder
        ? {
            useDefault: false,
            overrides: [
              {
                method: 'notification',
                minutes: event.reminder.minutesBefore
              }
            ]
          }
        : undefined,
      recurrence: event.recurring
        ? [`RRULE:FREQ=${event.recurring.pattern === 'yearly' ? 'YEARLY' : 'MONTHLY'}`]
        : undefined
    };
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

