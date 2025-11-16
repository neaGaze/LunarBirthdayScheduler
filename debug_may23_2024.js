/**
 * Debug lunar birthday calculation for May 23, 2024
 * Compare what the sync calculates vs what the app shows
 */

import * as Astronomy from 'astronomy-engine';

function calculateTithi(year, month, day) {
  const elongation = Astronomy.MoonPhase(new Date(year, month - 1, day));
  let tithiNumber = Math.floor(elongation / 12) + 1;
  if (tithiNumber > 30) tithiNumber = 30;
  if (tithiNumber < 1) tithiNumber = 1;
  return tithiNumber;
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Birth date: May 23, 2024
const birthDate = new Date(2024, 4, 23); // month is 0-indexed (4 = May)
const birthTithi = calculateTithi(2024, 5, 23);
const birthDayOfYear = getDayOfYear(birthDate);

console.log('================================================================================');
console.log('DEBUGGING MAY 23, 2024 LUNAR BIRTHDAY SYNC');
console.log('================================================================================');
console.log(`Birth date: May 23, 2024`);
console.log(`Birth tithi: ${birthTithi}`);
console.log(`Birth day of year: ${birthDayOfYear}`);
console.log('================================================================================\n');

// Find what the sync calculates for 2026
console.log('WHAT THE SYNC IS CALCULATING FOR 2026:');
console.log('Looking for tithi occurrences in 2026...\n');

const tithiOccurrences = [];

for (let month = 1; month <= 12; month++) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const tithi = calculateTithi(2026, month, day);

    if (tithi === birthTithi) {
      const occurrence = new Date(2026, month - 1, day);
      const dayOfYear = getDayOfYear(occurrence);
      tithiOccurrences.push({ date: occurrence, dayOfYear });
    }
  }
}

console.log(`Found ${tithiOccurrences.length} occurrences of Tithi ${birthTithi} in 2026:\n`);

tithiOccurrences.forEach((occ, i) => {
  const isBefore = occ.dayOfYear < birthDayOfYear;
  const diff = Math.abs(occ.dayOfYear - birthDayOfYear);
  console.log(`${i + 1}. ${occ.date.toDateString()} (day ${occ.dayOfYear}) - ${isBefore ? 'BEFORE' : 'AFTER'} birth day ${birthDayOfYear} (diff: ${diff})`);
});

// Find the one BEFORE the birth day-of-year
let bestOccurrence = null;
let bestDayOfYear = -1;

for (const occ of tithiOccurrences) {
  if (occ.dayOfYear < birthDayOfYear && occ.dayOfYear > bestDayOfYear) {
    bestDayOfYear = occ.dayOfYear;
    bestOccurrence = occ.date;
  }
}

console.log('\n================================================================================');
if (bestOccurrence) {
  console.log(`✓ SYNC SHOULD USE: ${bestOccurrence.toDateString()} (day ${bestDayOfYear})`);
  console.log(`  This is the tithi occurrence that comes BEFORE day ${birthDayOfYear}`);
} else {
  console.log(`✗ NO OCCURRENCE FOUND BEFORE day ${birthDayOfYear}`);
  console.log(`  Fallback: Would use last occurrence of year`);
}
console.log('================================================================================');
