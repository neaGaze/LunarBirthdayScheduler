/**
 * Verify lunar birthday calculation for June 26, 1991
 * Finding the tithi occurrence BEFORE the original birth day-of-year
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

  // Find the occurrence that comes BEFORE the original birth day-of-year
  // This is the last occurrence where dayOfYear < originalBirthDayOfYear
  let bestOccurrence = null;
  let bestDayOfYear = -1;

  for (const occurrence of tithiOccurrences) {
    const dayOfYear = getDayOfYear(occurrence);

    console.log(`  ${occurrence.toDateString()}: day ${dayOfYear}`);

    // We want the occurrence that's before the original day but as close as possible
    if (dayOfYear < originalBirthDayOfYear && dayOfYear > bestDayOfYear) {
      bestDayOfYear = dayOfYear;
      bestOccurrence = occurrence;
    }
  }

  if (bestOccurrence) {
    console.log(`✓ Best occurrence (before day ${originalBirthDayOfYear}): ${bestOccurrence.toDateString()} (day ${bestDayOfYear})`);
  } else {
    console.log(`✗ No occurrence found before day ${originalBirthDayOfYear}, using last occurrence of previous year`);
    // If no occurrence before the target day in this year, we'd need to look at previous year's last occurrence
    // For now, return null to indicate this edge case
  }

  return bestOccurrence;
}

// Birth date: June 26, 1991
const birthDate = new Date(1991, 5, 26); // month is 0-indexed
const birthTithi = calculateTithi(1991, 6, 26);
const birthDayOfYear = getDayOfYear(birthDate);

console.log('================================================================================');
console.log('FINDING TITHI OCCURRENCE **BEFORE** ORIGINAL BIRTH DAY-OF-YEAR');
console.log('================================================================================');
console.log(`Birth date: June 26, 1991`);
console.log(`Birth tithi: ${birthTithi} (Purnima - Full Moon)`);
console.log(`Birth day of year: ${birthDayOfYear}`);
console.log('================================================================================');

// Find next 3 occurrences (that are not in the past)
const today = new Date();
const results = [];

for (let year = 2025; year <= 2035; year++) {
  const occurrence = findLunarBirthdayForYear(year, birthTithi, birthDayOfYear);

  if (occurrence && occurrence > today) {
    results.push(occurrence);
  }

  if (results.length === 3) {
    break;
  }
}

console.log('\n================================================================================');
console.log('FINAL RESULTS - Next 3 Lunar Birthdays (BEFORE original day-of-year):');
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
