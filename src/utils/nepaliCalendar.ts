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

// Import the fixed wrapper instead of the original library
// The wrapper re-implements the conversion functions with proper variable scoping
import nepaliCalendarLib from '../lib/nepaliCalendarFixed';

/**
 * Convert Gregorian date to Nepali date
 * Uses the fixed wrapper with proper variable scoping
 */
export function gregorianToNepali(date: GregorianDate): NepaliDate {
  try {
    const result = nepaliCalendarLib.toNepali(date.year, date.month, date.day);
    // toNepali returns an array [year, month, day]
    return {
      year: Array.isArray(result) ? result[0] : result.ny,
      month: Array.isArray(result) ? result[1] : result.nm,
      day: Array.isArray(result) ? result[2] : result.nd,
    };
  } catch (error) {
    console.error('Error converting to Nepali date:', error, date);
    return { year: 2082, month: 8, day: 1 };
  }
}

/**
 * Convert Nepali date to Gregorian date
 * Uses the fixed wrapper with proper variable scoping
 */
export function nepaliToGregorian(date: NepaliDate): GregorianDate {
  try {
    const result = nepaliCalendarLib.toGregorian(date.year, date.month, date.day);
    // toGregorian returns an array [year, month, day]
    return {
      year: Array.isArray(result) ? result[0] : result.gy,
      month: Array.isArray(result) ? result[1] : result.gm,
      day: Array.isArray(result) ? result[2] : result.gd,
    };
  } catch (error) {
    console.error('Error converting to Gregorian date:', error, date);
    return { year: 2025, month: 11, day: 7 };
  }
}

/**
 * Calculate tithi (lunar day) for a given date
 * Uses astronomical calculations based on lunar age
 * Lunar synodic month: 29.530588 days
 *
 * Algorithm:
 * - Finds the most recent new moon before or on the given date
 * - Calculates days elapsed since that new moon
 * - Converts to tithi number (1-30) using lunar month cycle
 * - Reference: May 9, 2025 is a documented new moon
 */
export function calculateTithi(date: GregorianDate): TithiInfo {
  const lunarMonth = 29.530588;
  const titthiDuration = lunarMonth / 30;

  // Known new moon reference: May 9, 2025
  const knownNewMoon = new Date(2025, 4, 9);
  const currentDate = new Date(date.year, date.month - 1, date.day);

  // Calculate days since the known new moon
  const daysSinceKnownNewMoon = (currentDate.getTime() - knownNewMoon.getTime()) / (24 * 60 * 60 * 1000);

  // Calculate position in current lunar month (0 to 29.53)
  // Using modulo to handle both past and future dates
  let positionInMonth = daysSinceKnownNewMoon % lunarMonth;
  if (positionInMonth < 0) {
    positionInMonth += lunarMonth;
  }

  // Convert position to tithi number (1-30)
  let tithiNumber = Math.floor(positionInMonth / titthiDuration) + 1;

  // Ensure tithi is in valid range (1-30)
  if (tithiNumber > 30) {
    tithiNumber = 30;
  }
  if (tithiNumber < 1) {
    tithiNumber = 1;
  }

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
