// Wrapper for nepali-calendar-js library to work with Vite
// This just exposes the library on the window object
// The actual conversion is done by nepaliCalendarFixed.js which has proper variable scoping

import nepaliCalendar from 'nepali-calendar-js';

// Expose on window for potential synchronous access
if (typeof window !== 'undefined') {
  window.__NepaliCalendar = nepaliCalendar;
}

export default nepaliCalendar;
export const {
  toNepali,
  toGregorian,
  isValidNepaliDate,
  isLeapNepaliYear,
  nepaliMonthLength,
  nepaliCalendarData,
  n2d,
  d2n,
  g2d,
  d2g
} = nepaliCalendar;
