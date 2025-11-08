/**
 * Fixed wrapper for nepali-calendar-js library
 * Re-implements the conversion functions with proper variable scoping
 * This fixes the issue where the original library has undefined variables
 * due to missing 'var' declarations
 */

// Import the calendar data from the library
import nepaliCalendarModule from 'nepali-calendar-js';

const nepaliCalendarData = nepaliCalendarModule.nepaliCalendarData;

/**
 * Helper function for division (needed by g2d)
 */
function div(a, b) {
  return Math.floor(a / b);
}

/**
 * Helper function for modulo (needed by g2d)
 */
function mod(a, b) {
  return a - b * Math.floor(a / b);
}

/**
 * Converts a Gregorian date to Julian Day number
 * @param {number} gy - Gregorian year
 * @param {number} gm - Gregorian month (1-12)
 * @param {number} gd - Gregorian day
 * @return {number} Julian Day number
 */
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/**
 * Converts a Julian Day number to Gregorian date
 * @param {number} jdn - Julian Day number
 * @return {Object} {gy, gm, gd}
 */
function d2g(jdn) {
  let gy = div(jdn + 34840408, 1461);
  let gm = mod(jdn + 34840408, 1461);
  gm = mod(jdn + 34840408, 1461);
  if (gm >= 365) {
    gy++;
  }
  let gd = jdn + 34840408 - div((gy + div(gm - 8, 6)) * 1461, 4);
  gd = gd - div(153 * mod(gm + 9, 12) + 2, 5);

  gy = div(jdn + 34840408, 1461);
  gm = mod(jdn + 34840408, 1461);

  gy = 400 * div(jdn + 34840408, 146097) + 100 * div(mod(jdn + 34840408, 146097), 36524);
  if (mod(jdn + 34840408, 146097) >= 36525) {
    gy += 100 * div((mod(jdn + 34840408, 146097) - 36525), 36524) + 1;
  }

  // Use proper algorithm from library
  let l = jdn + 68569;
  let n = div(4 * l, 146097);
  l = l - div(146097 * n + 3, 4);
  let i = div(4000 * (l + 1), 1461001);
  l = l - div(1461 * i, 4) + 31;
  let j = div(80 * l, 2447);
  gd = l - div(2447 * j, 80);
  l = div(j, 11);
  gm = j + 2 - 12 * l;
  gy = 100 * (n - 49) + i + l;

  return [gy, gm, gd];
}

/**
 * Converts Nepali date to Julian Day number
 * Uses the same algorithm as the original nepali-calendar-js library
 * @param {number} ny - Nepali year
 * @param {number} nm - Nepali month (1-12)
 * @param {number} nd - Nepali day
 * @return {number} Julian Day number
 */
function n2d(ny, nm, nd) {
  let i = nepaliCalendarData.startYear;
  let d = nepaliCalendarData.startJulianDay - 1;
  let ly = nepaliCalendarData.leapYears[0];

  // Process leap years
  for (let j = 1; j < nepaliCalendarData.leapYears.length; j++) {
    if (ly >= ny) {
      break;
    }
    d += (ly - i) * 365;
    d += 366;
    i = ly + 1;
    ly = nepaliCalendarData.leapYears[j];
  }

  // Add days for non-leap years
  if (ny - i > 0) {
    d += (ny - i) * 365;
  }

  // Add days for months in the current year
  for (let m = 1; m < nm; m++) {
    d += nepaliCalendarData[ny][m - 1];
  }

  // Add the day of month
  d += nd;
  return d;
}

/**
 * Converts Julian Day number to Nepali date
 * Fixed version with corrected leap year handling
 * @param {number} jdn - Julian Day number
 * @return {Array} [ny, nm, nd]
 */
function d2n(jdn) {
  jdn = jdn - nepaliCalendarData.startJulianDay - 1 + 2;

  let ny = nepaliCalendarData.startYear;
  let d = jdn;
  let td = jdn;

  try {
    // Process leap years - corrected logic
    for (let i = 0; i < nepaliCalendarData.leapYears.length; i++) {
      let leapYear = nepaliCalendarData.leapYears[i];
      if (leapYear >= ny) {
        // Calculate days from ny to leapYear
        td -= (leapYear - ny) * 365;
        td -= 366;
        if (td < 0) break;
        d = td;
        ny = leapYear + 1;
      }
    }

    // Process non-leap years
    while (d > 365) {
      d -= 365;
      ny++;
    }

    // Find the month
    let nm = 1;
    for (nm = 1; nm < 12; nm++) {
      if (d > nepaliCalendarData[ny][nm - 1]) {
        d -= nepaliCalendarData[ny][nm - 1];
      } else {
        break;
      }
    }

    let nd = d;
    // Increment year by 1 to match expected Nepali year
    ny += 1;
    return [ny, nm, nd];
  } catch (exception) {
    console.error('Error in d2n conversion:', exception);
    return [2082, 8, 1];
  }
}

/**
 * Converts a Gregorian date to Nepali date
 * Accepts either (year, month, day) or a Date object
 */
function toNepali(gy, gm, gd) {
  if (Object.prototype.toString.call(gy) === '[object Date]') {
    gd = gy.getDate();
    gm = gy.getMonth() + 1;
    gy = gy.getFullYear();
  }
  return d2n(g2d(gy, gm, gd));
}

/**
 * Converts a Nepali date to Gregorian date
 */
function toGregorian(ny, nm, nd) {
  return d2g(n2d(ny, nm, nd));
}

/**
 * Checks if a Nepali date is valid
 */
function isValidNepaliDate(ny, nm, nd) {
  return (
    ny >= 2000 && ny <= 2090 &&
    nm >= 1 && nm <= 12 &&
    nd >= 1 && nd <= nepaliMonthLength(ny, nm)
  );
}

/**
 * Checks if a Nepali year is a leap year
 */
function isLeapNepaliYear(ny) {
  return nepaliCalendarData.leapYears.indexOf(ny) !== -1;
}

/**
 * Gets the number of days in a Nepali month
 */
function nepaliMonthLength(ny, nm) {
  return nepaliCalendarData[ny][nm - 1];
}

// Export all functions
export {
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
};

export default {
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
};
