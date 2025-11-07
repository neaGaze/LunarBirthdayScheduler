/**
 * Nepali Calendar Google Calendar Plugin
 * Main entry point
 */

export { GoogleCalendarService } from './services/googleCalendarService.js';
export { NepaliEventService } from './services/nepaliEventService.js';
export { SyncService } from './services/syncService.js';

export * from './utils/nepaliCalendar.js';

// Export types
export type { CalendarEvent } from './services/googleCalendarService.js';
export type { NepaliCalendarEvent, LunarBirthday } from './services/nepaliEventService.js';
export type { SyncConfig, SyncResult } from './services/syncService.js';
export type { NepaliDate, GregorianDate, TithiInfo } from './utils/nepaliCalendar.js';
