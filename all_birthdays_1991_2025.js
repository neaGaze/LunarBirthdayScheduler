/**
 * Calculate all lunar birthdays from 1991 to 2025 for June 26, 1991
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

  if (tithiOccurrences.length === 0) {
    return null;
  }

  // Find the occurrence that comes BEFORE the original birth day-of-year
  let bestOccurrence = null;
  let bestDayOfYear = -1;

  for (const occurrence of tithiOccurrences) {
    const dayOfYear = getDayOfYear(occurrence);

    if (dayOfYear < originalBirthDayOfYear && dayOfYear > bestDayOfYear) {
      bestDayOfYear = dayOfYear;
      bestOccurrence = occurrence;
    }
  }

  return bestOccurrence;
}

// Birth date: June 26, 1991
const birthDate = new Date(1991, 5, 26);
const birthTithi = calculateTithi(1991, 6, 26);
const birthDayOfYear = getDayOfYear(birthDate);

console.log('================================================================================');
console.log('ALL LUNAR BIRTHDAYS FROM 1991 TO 2025');
console.log('================================================================================');
console.log(`Birth date: June 26, 1991 (Day ${birthDayOfYear} of year)`);
console.log(`Birth tithi: ${birthTithi} (Purnima - Full Moon)`);
console.log('================================================================================\n');

const allBirthdays = [];

// Calculate for each year from 1991 to 2025
for (let year = 1991; year <= 2025; year++) {
  const occurrence = findLunarBirthdayForYear(year, birthTithi, birthDayOfYear);

  if (occurrence) {
    allBirthdays.push({
      year: year,
      date: occurrence,
      dayOfYear: getDayOfYear(occurrence)
    });
  }
}

// Print all birthdays
allBirthdays.forEach((birthday, index) => {
  const dateStr = birthday.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  console.log(`${birthday.year}: ${dateStr} (day ${birthday.dayOfYear})`);

  // Show days since previous birthday
  if (index > 0) {
    const daysSince = Math.round((birthday.date - allBirthdays[index - 1].date) / (1000 * 60 * 60 * 24));
    console.log(`       (${daysSince} days since previous lunar birthday)`);
  }

  console.log('');
});

console.log('================================================================================');
console.log(`Total lunar birthdays found: ${allBirthdays.length}`);
console.log('================================================================================');
