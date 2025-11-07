/**
 * Nepali Calendar Utilities
 * Handles conversion between Nepali (BS) and Gregorian (AD) dates
 * and Tithi (lunar day) calculations
 */

// Nepali month names (1-12)
export const NEPALI_MONTH_NAMES = [
  'Baisakh',    // 1
  'Jestha',     // 2
  'Asar',       // 3
  'Shrawan',    // 4
  'Bhadra',     // 5
  'Ashwin',     // 6
  'Kartik',     // 7
  'Mangsir',    // 8
  'Poush',      // 9
  'Magh',       // 10
  'Falgun',     // 11
  'Chaitra'     // 12
];

// Tithi names in Nepali calendar (1-30)
export const TITHI_NAMES = [
  'Pratipad', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipad', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

// Major Nepali festivals
export const NEPALI_FESTIVALS = [
  { name: 'Prithvi Jayanti', month: 'Baisakh', day: 1, isLunar: false },
  { name: 'Teej', month: 'Shrawan', day: 16, isLunar: true },
  { name: 'Dashain', month: 'Ashoj', startDay: 1, endDay: 15, isLunar: false },
  { name: 'Tihar', month: 'Kartik', startDay: 1, endDay: 5, isLunar: false },
  { name: 'Chhath', month: 'Kartik', day: 20, isLunar: false },
  { name: 'Maha Shivaratri', month: 'Falgun', day: 14, isLunar: true },
  { name: 'Holi', month: 'Falgun', day: 15, isLunar: true },
  { name: 'Eid', month: 'Varies', day: 1, isLunar: true }, // Islamic calendar
];

export interface NepaliDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

export interface TithiInfo {
  name: string;
  number: number;
  phase: 'waxing' | 'waning';
}

// Cache for the NepaliCalendar module
let nepaliCalendarModule: any = null;

async function loadNepaliCalendar() {
  if (nepaliCalendarModule) {
    return nepaliCalendarModule;
  }

  try {
    // Use dynamic import with the full path to work with CommonJS module
    nepaliCalendarModule = await import('nepali-calendar-js');
    return nepaliCalendarModule;
  } catch (error) {
    console.warn('Failed to load nepali-calendar-js via import:', error);
    return null;
  }
}

// Import the fixed nepali calendar library with proper variable scoping
import { toNepali, toGregorian } from '../lib/nepaliCalendarFixed';

/**
 * Convert Gregorian date to Nepali date
 * Uses the fixed nepali-calendar-js wrapper with proper variable scoping
 */
export function gregorianToNepali(date: GregorianDate): NepaliDate {
  try {
    const result = toNepali(date.year, date.month, date.day);
    return {
      year: result[0],
      month: result[1],
      day: result[2],
    };
  } catch (error) {
    console.error('Error converting to Nepali date:', error, date);
    return { year: 2082, month: 8, day: 1 };
  }
}

/**
 * Convert Nepali date to Gregorian date
 * Uses the fixed nepali-calendar-js wrapper with proper variable scoping
 */
export function nepaliToGregorian(date: NepaliDate): GregorianDate {
  try {
    const result = toGregorian(date.year, date.month, date.day);
    return {
      year: result[0],
      month: result[1],
      day: result[2],
    };
  } catch (error) {
    console.error('Error converting to Gregorian date:', error, date);
    return { year: 2025, month: 11, day: 7 };
  }
}

/**
 * Calculate tithi (lunar day) for a given date
 * Tithi is a lunar day, and multiple tithis can occur on a single calendar day
 * This is a simplified calculation
 */
export function calculateTithi(date: GregorianDate): TithiInfo {
  // Simplified tithi calculation based on lunar phase
  // In reality, this requires astronomical calculations

  const dateObj = new Date(date.year, date.month - 1, date.day);
  const lunarPhase = (dateObj.getTime() / (24 * 60 * 60 * 1000)) % 29.53; // Lunar month cycle

  const tithiNumber = Math.floor((lunarPhase / 29.53) * 30) + 1;
  const phase = tithiNumber <= 15 ? 'waxing' : 'waning';

  return {
    name: TITHI_NAMES[tithiNumber - 1] || 'Unknown',
    number: tithiNumber,
    phase: phase
  };
}

/**
 * Get the Nepali month name from month number
 * @param month - Month number (1-12)
 * @returns Month name in English
 */
export function getNepaliMonthName(month: number): string {
  if (month < 1 || month > 12) {
    return 'Invalid';
  }
  return NEPALI_MONTH_NAMES[month - 1];
}

/**
 * Get upcoming festivals for a given month
 */
export function getUpcomingFestivals(nepaliMonth: number, nepaliYear: number): Array<{
  name: string;
  date: GregorianDate;
}> {
  const festivals = NEPALI_FESTIVALS
    .filter(festival => {
      if (festival.month === 'Varies') return false; // Skip Eid for now
      return true; // In production, would match month properly
    })
    .map(festival => ({
      name: festival.name,
      date: nepaliToGregorian({
        year: nepaliYear,
        month: nepaliMonth,
        day: festival.day || 1
      })
    }));

  return festivals;
}

/**
 * Check if a date is a major festival
 */
export function isMajorFestival(date: GregorianDate): string | null {
  const nepaliDate = gregorianToNepali(date);

  for (const festival of NEPALI_FESTIVALS) {
    if (festival.month === 'Varies') continue;

    // Simple check - would need proper month name mapping in production
    if (nepaliDate.day === festival.day) {
      return festival.name;
    }
  }

  return null;
}
