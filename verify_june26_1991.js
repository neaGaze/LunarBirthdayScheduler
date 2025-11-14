/**
 * Verify lunar birthday calculation for June 26, 1991
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

function findLunarBirthdayForYear(targetYear, targetTithiNumber, originalBirthDayOfYear) {
  console.log(`\n=== Finding Tithi ${targetTithiNumber} for year ${targetYear} ===`);
  console.log(`Original birth was on day ${originalBirthDayOfYear} of year`);

  const tithiOccurrences = [];

  // Search through the entire year
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(targetYear, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const tithi = calculateTithi(targetYear, month, day);

      if (tithi === targetTithiNumber) {
        tithiOccurrences.push(new Date(targetYear, month - 1, day));
      }
    }
  }

  console.log(`Found ${tithiOccurrences.length} occurrences of Tithi ${targetTithiNumber} in ${targetYear}`);

  if (tithiOccurrences.length === 0) {
    return null;
  }

  // Find the occurrence closest to the original birth day-of-year
  let closestOccurrence = tithiOccurrences[0];
  let minDifference = Math.abs(getDayOfYear(closestOccurrence) - originalBirthDayOfYear);

  for (const occurrence of tithiOccurrences) {
    const dayOfYear = getDayOfYear(occurrence);
    const difference = Math.abs(dayOfYear - originalBirthDayOfYear);

    console.log(`  ${occurrence.toDateString()}: day ${dayOfYear}, diff = ${difference}`);

    if (difference < minDifference) {
      minDifference = difference;
      closestOccurrence = occurrence;
    }
  }

  console.log(`✓ Closest occurrence: ${closestOccurrence.toDateString()} (day ${getDayOfYear(closestOccurrence)} vs original day ${originalBirthDayOfYear})`);
  return closestOccurrence;
}

// Birth date: June 26, 1991
const birthDate = new Date(1991, 5, 26); // month is 0-indexed
const birthTithi = calculateTithi(1991, 6, 26);
const birthDayOfYear = getDayOfYear(birthDate);

console.log('================================================================================');
console.log('VERIFYING LUNAR BIRTHDAY CALCULATION FOR JUNE 26, 1991');
console.log('================================================================================');
console.log(`Birth date: June 26, 1991`);
console.log(`Birth tithi: ${birthTithi} (Purnima - Full Moon)`);
console.log(`Birth day of year: ${birthDayOfYear}`);
console.log('================================================================================');

// Find next 3 occurrences
const results = [];
for (let year = 2025; year <= 2027; year++) {
  const occurrence = findLunarBirthdayForYear(year, birthTithi, birthDayOfYear);
  if (occurrence) {
    results.push(occurrence);
  }
}

console.log('\n================================================================================');
console.log('FINAL RESULTS - Next 3 Lunar Birthdays:');
console.log('================================================================================');
results.forEach((date, index) => {
  console.log(`${index + 1}. ${date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`);

  if (index > 0) {
    const daysBetween = Math.round((date - results[index - 1]) / (1000 * 60 * 60 * 24));
    console.log(`   (${daysBetween} days from previous)`);
  }
});
console.log('================================================================================');
