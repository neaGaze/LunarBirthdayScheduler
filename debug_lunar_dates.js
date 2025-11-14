/**
 * Debug script to analyze lunar patterns
 * Calculate all full moons and tithi occurrences from 1991 to 2028
 */

import * as Astronomy from 'astronomy-engine';

/**
 * Calculate tithi (lunar day) for a given date
 */
function calculateTithi(year, month, day) {
  try {
    const elongation = Astronomy.MoonPhase(new Date(year, month - 1, day));
    let tithiNumber = Math.floor(elongation / 12) + 1;

    if (tithiNumber > 30) tithiNumber = 30;
    if (tithiNumber < 1) tithiNumber = 1;

    const phase = tithiNumber <= 15 ? 'waxing' : 'waning';

    return {
      number: tithiNumber,
      phase: phase,
      elongation: elongation
    };
  } catch (error) {
    console.error('Error calculating tithi:', error);
    return null;
  }
}

/**
 * Find all full moons between two dates
 */
function findAllFullMoons(startYear, endYear) {
  console.log('\n=== ALL FULL MOONS ===\n');

  let currentDate = new Date(startYear, 0, 1);
  const endDate = new Date(endYear, 11, 31);
  const fullMoons = [];

  while (currentDate <= endDate) {
    try {
      const searchResult = Astronomy.SearchMoonPhase(180, currentDate, 40);
      if (searchResult && searchResult.date <= endDate) {
        fullMoons.push(searchResult.date);
        console.log(`${searchResult.date.toDateString()} - ${searchResult.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`);

        // Move to day after this full moon
        currentDate = new Date(searchResult.date);
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        break;
      }
    } catch (error) {
      console.error('Error finding full moon:', error);
      break;
    }
  }

  return fullMoons;
}

/**
 * Find the tithi for the birth date and track all occurrences
 */
function findTithiOccurrences(birthYear, birthMonth, birthDay, endYear) {
  // Get tithi for birth date
  const birthTithi = calculateTithi(birthYear, birthMonth, birthDay);
  console.log('\n=== BIRTH DATE ANALYSIS ===');
  console.log(`Birth Date: ${birthMonth}/${birthDay}/${birthYear}`);
  console.log(`Birth Tithi: ${birthTithi.number} (${birthTithi.phase} phase)`);
  console.log(`Elongation: ${birthTithi.elongation.toFixed(2)}°\n`);

  console.log(`\n=== ALL OCCURRENCES OF TITHI ${birthTithi.number} (from ${birthYear} to ${endYear}) ===\n`);

  const occurrences = [];
  let lastOccurrence = null;

  // Search day by day
  for (let year = birthYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const tithi = calculateTithi(year, month, day);

        if (tithi && tithi.number === birthTithi.number) {
          const currentDate = new Date(year, month - 1, day);

          // Calculate days since last occurrence
          let daysSince = 0;
          if (lastOccurrence) {
            daysSince = Math.round((currentDate - lastOccurrence) / (1000 * 60 * 60 * 24));
          }

          occurrences.push({
            date: currentDate,
            daysSinceLast: daysSince
          });

          const daysInfo = lastOccurrence ? ` (${daysSince} days since last)` : ' (BIRTH DATE)';
          console.log(`${currentDate.toDateString()} - ${currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}${daysInfo}`);

          lastOccurrence = currentDate;
        }
      }
    }
  }

  // Statistics
  console.log(`\n=== STATISTICS ===`);
  console.log(`Total occurrences: ${occurrences.length}`);

  if (occurrences.length > 1) {
    const intervals = occurrences.slice(1).map(o => o.daysSinceLast);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);

    console.log(`Average interval: ${avgInterval.toFixed(1)} days (~${(avgInterval / 29.53).toFixed(1)} lunar months)`);
    console.log(`Min interval: ${minInterval} days`);
    console.log(`Max interval: ${maxInterval} days`);

    // Count intervals by range
    const ranges = {
      '0-30 days': 0,
      '31-60 days': 0,
      '320-400 days (lunar year)': 0,
      'Other': 0
    };

    intervals.forEach(interval => {
      if (interval <= 30) ranges['0-30 days']++;
      else if (interval <= 60) ranges['31-60 days']++;
      else if (interval >= 320 && interval <= 400) ranges['320-400 days (lunar year)']++;
      else ranges['Other']++;
    });

    console.log('\nInterval distribution:');
    Object.entries(ranges).forEach(([range, count]) => {
      console.log(`  ${range}: ${count} occurrences`);
    });
  }

  return occurrences;
}

// Run analysis
console.log('='.repeat(80));
console.log('LUNAR DATE ANALYSIS FOR BIRTH DATE: JUNE 26, 1991');
console.log('='.repeat(80));

// Find all full moons from 1991 to 2028
findAllFullMoons(1991, 2028);

// Find all occurrences of the birth tithi
findTithiOccurrences(1991, 6, 26, 2028);
