import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { nepaliToGregorian, gregorianToNepali, calculateTithi, TITHI_NAMES } from '../utils/nepaliCalendar.js';
import './BirthdayTracker.css';

const BirthdayTracker: React.FC = () => {
  const { addBirthday, birthdays } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [dateInputMode, setDateInputMode] = useState<'nepali' | 'gregorian'>('gregorian');
  const [saveBirthdayMode, setSaveBirthdayMode] = useState<'date' | 'tithi'>('date');
  const [formData, setFormData] = useState({
    name: '',
    nepaliYear: 2050,
    nepaliMonth: 1,
    nepaliDay: 1,
    gregorianYear: 1990,
    gregorianMonth: 1,
    gregorianDay: 1,
    reminderEnabled: true,
    tithiNumber: 0, // Will be calculated
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : parseInt(value) || value,
    };

    // Auto-convert dates based on which mode is active
    if (dateInputMode === 'gregorian') {
      // If user is entering Gregorian date, convert to Nepali
      const gregorianDateFields = ['gregorianYear', 'gregorianMonth', 'gregorianDay'];
      if (gregorianDateFields.includes(name)) {
        const gregDate = {
          year: name === 'gregorianYear' ? parseInt(value) || newData.gregorianYear : newData.gregorianYear,
          month: name === 'gregorianMonth' ? parseInt(value) || newData.gregorianMonth : newData.gregorianMonth,
          day: name === 'gregorianDay' ? parseInt(value) || newData.gregorianDay : newData.gregorianDay,
        };

        const nepaliDate = gregorianToNepali(gregDate);
        newData.nepaliYear = nepaliDate.year;
        newData.nepaliMonth = nepaliDate.month;
        newData.nepaliDay = nepaliDate.day;

        // Calculate tithi for the Gregorian date
        const tithi = calculateTithi(gregDate);
        newData.tithiNumber = tithi.number;
      }
    } else {
      // If user is entering Nepali date, convert to Gregorian
      const nepaliDateFields = ['nepaliYear', 'nepaliMonth', 'nepaliDay'];
      if (nepaliDateFields.includes(name)) {
        const nepDate = {
          year: name === 'nepaliYear' ? parseInt(value) || newData.nepaliYear : newData.nepaliYear,
          month: name === 'nepaliMonth' ? parseInt(value) || newData.nepaliMonth : newData.nepaliMonth,
          day: name === 'nepaliDay' ? parseInt(value) || newData.nepaliDay : newData.nepaliDay,
        };

        const gregDate = nepaliToGregorian(nepDate);
        newData.gregorianYear = gregDate.year;
        newData.gregorianMonth = gregDate.month;
        newData.gregorianDay = gregDate.day;

        // Calculate tithi for the Gregorian date
        const tithi = calculateTithi(gregDate);
        newData.tithiNumber = tithi.number;
      }
    }

    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter the person name');
      return;
    }

    try {
      addBirthday({
        name: formData.name,
        nepaliDate: {
          year: formData.nepaliYear,
          month: formData.nepaliMonth,
          day: formData.nepaliDay,
        },
        gregorianBirthDate: {
          year: formData.gregorianYear,
          month: formData.gregorianMonth,
          day: formData.gregorianDay,
        },
        reminder: {
          enabled: formData.reminderEnabled,
          minutesBefore: 1440,
        },
        // Add tithi-based birthday support
        isTithiBased: saveBirthdayMode === 'tithi',
        tithiNumber: formData.tithiNumber,
      });

      setFormData({
        name: '',
        nepaliYear: 2050,
        nepaliMonth: 1,
        nepaliDay: 1,
        gregorianYear: 1990,
        gregorianMonth: 1,
        gregorianDay: 1,
        reminderEnabled: true,
        tithiNumber: 0,
      });
      setShowForm(false);
      setSaveBirthdayMode('date');
    } catch (error) {
      console.error('Error adding birthday:', error);
      alert('Failed to add birthday');
    }
  };

  const getAge = (birthYear: number): number => {
    return new Date().getFullYear() - birthYear;
  };

  const getUpcomingBirthday = (gregorianDate: { month: number; day: number }): boolean => {
    const today = new Date();
    const birthDate = new Date(new Date().getFullYear(), gregorianDate.month - 1, gregorianDate.day);
    return birthDate >= today;
  };

  /**
   * Find the lunar birthday occurrence for a specific solar year
   *
   * IMPORTANT: Tithis repeat every ~29.5 days (each lunar month).
   * A "lunar birthday" is celebrated ONCE per SOLAR YEAR on the tithi
   * that falls just BEFORE the original birth date's position in the year.
   *
   * Algorithm:
   * 1. For the given solar year, find ALL occurrences of the target tithi
   * 2. Pick the occurrence that comes just BEFORE the original birth date's
   *    day-of-year position (e.g., if born on day 177, find the last tithi
   *    occurrence where day-of-year < 177)
   */
  const findLunarBirthdayForYear = (
    targetYear: number,
    targetTithiNumber: number,
    originalBirthDayOfYear: number
  ): Date | null => {
    console.log(`[findLunarBirthdayForYear] Finding Tithi ${targetTithiNumber} for year ${targetYear}`);
    console.log(`[findLunarBirthdayForYear] Original birth was on day ${originalBirthDayOfYear} of year`);

    const tithiOccurrences: Date[] = [];

    // Search through the entire year
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(targetYear, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const checkDate = {
          year: targetYear,
          month: month,
          day: day
        };

        const tithi = calculateTithi(checkDate);

        if (tithi.number === targetTithiNumber) {
          tithiOccurrences.push(new Date(targetYear, month - 1, day));
        }
      }
    }

    console.log(`[findLunarBirthdayForYear] Found ${tithiOccurrences.length} occurrences of Tithi ${targetTithiNumber} in ${targetYear}`);

    if (tithiOccurrences.length === 0) {
      return null;
    }

    // Find the occurrence that comes BEFORE the original birth day-of-year
    // This is the last occurrence where dayOfYear < originalBirthDayOfYear
    let bestOccurrence: Date | null = null;
    let bestDayOfYear = -1;

    for (const occurrence of tithiOccurrences) {
      const dayOfYear = getDayOfYear(occurrence);

      // We want the occurrence that's before the original day but as close as possible
      if (dayOfYear < originalBirthDayOfYear && dayOfYear > bestDayOfYear) {
        bestDayOfYear = dayOfYear;
        bestOccurrence = occurrence;
      }
    }

    if (bestOccurrence) {
      console.log(`[findLunarBirthdayForYear] Best occurrence (before day ${originalBirthDayOfYear}): ${bestOccurrence.toDateString()} (day ${bestDayOfYear})`);
      return bestOccurrence;
    }

    // If no occurrence found before the target day, it means the first occurrence
    // of the year is after the birth day. In this case, we should use the last
    // occurrence from the previous year. For simplicity, return null here and
    // let the calling function handle it.
    console.log(`[findLunarBirthdayForYear] No occurrence found before day ${originalBirthDayOfYear} in ${targetYear}`);
    return null;
  };

  /**
   * Get day of year (1-366) for a date
   */
  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  /**
   * Calculate lunar birthdays for future years
   *
   * Algorithm:
   * - A tithi repeats every ~29.5 days (12-13 times per solar year)
   * - The "lunar birthday" is the occurrence that comes just BEFORE the original
   *   birth date's position in the solar year
   * - For each future year, find all tithi occurrences and pick the one that
   *   comes just before the original birth day-of-year
   */
  const calculateYearlyTithiBirthdays = (
    gregorianBirthYear: number,
    gregorianBirthMonth: number,
    gregorianBirthDay: number,
    targetTithiNumber: number
  ): Date[] => {
    const lunarBirthdays: Date[] = [];

    // Calculate the original birth date's day-of-year (e.g., June 26 = day 177)
    const originalBirthDate = new Date(gregorianBirthYear, gregorianBirthMonth - 1, gregorianBirthDay);
    const originalDayOfYear = getDayOfYear(originalBirthDate);

    console.log('==== calculateYearlyTithiBirthdays ====');
    console.log(`Birth date: ${gregorianBirthMonth}/${gregorianBirthDay}/${gregorianBirthYear}`);
    console.log(`Original day of year: ${originalDayOfYear}`);
    console.log(`Target Tithi: ${targetTithiNumber}`);

    // Find lunar birthdays for the next several years
    const currentYear = new Date().getFullYear();
    const yearsToCalculate = 10; // Calculate for next 10 years

    for (let yearOffset = 0; yearOffset < yearsToCalculate; yearOffset++) {
      const targetYear = currentYear + yearOffset;

      const birthdayForYear = findLunarBirthdayForYear(
        targetYear,
        targetTithiNumber,
        originalDayOfYear
      );

      if (birthdayForYear) {
        // Only add future dates
        if (birthdayForYear.getTime() > new Date().getTime()) {
          lunarBirthdays.push(birthdayForYear);
          console.log(`Added ${birthdayForYear.toDateString()} for year ${targetYear}`);
        }
      }
    }

    console.log('\n==== Final Results ====');
    console.log('Total future occurrences found:', lunarBirthdays.length);
    lunarBirthdays.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.toDateString()}`);
    });

    return lunarBirthdays;
  };


  /**
   * Count occurrences of a tithi between two dates (sanity check)
   * Between two occurrences of the same tithi, there should be 12 other occurrences
   * (i.e., 12 complete lunar months pass, each with one occurrence of this tithi)
   */
  const countTithiBetweenDates = (startDate: Date, endDate: Date, targetTithiNumber: number): number => {
    let count = 0;
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from day after first occurrence

    while (currentDate < endDate) {
      const checkDate = {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate()
      };

      const tithi = calculateTithi(checkDate);
      if (tithi.number === targetTithiNumber) {
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  };


  /**
   * Get next 3 occurrences of a specific tithi
   *
   * Algorithm:
   * 1. Calculate lunar birthday occurrences for future years
   * 2. Return the first 3 future occurrences
   * 3. Each occurrence is ~1 solar year apart (365 days)
   * 4. Sanity check: between each occurrence, the target tithi appears ~12 times (once per lunar month)
   */
  const getNextThreeYearsTithiDates = (tithiNumber: number): Date[] => {
    const dates: Date[] = [];

    // Calculate lunar birthday occurrences based on original Gregorian birth date
    const allLunarBirthdays = calculateYearlyTithiBirthdays(
      formData.gregorianYear,
      formData.gregorianMonth,
      formData.gregorianDay,
      tithiNumber
    );

    // Collect the first 3 occurrences
    for (const birthday of allLunarBirthdays) {
      dates.push(birthday);

      // Stop after finding 3 dates
      if (dates.length === 3) {
        break;
      }
    }

    // Sanity check: Log the count of tithis between occurrences
    if (dates.length >= 2) {
      for (let i = 0; i < dates.length - 1; i++) {
        const countBetween = countTithiBetweenDates(dates[i], dates[i + 1], tithiNumber);
        const daysBetween = Math.round((dates[i + 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
        console.log(
          `Tithi ${TITHI_NAMES[tithiNumber - 1]} between ${dates[i].toDateString()} and ${dates[i + 1].toDateString()}: ` +
          `${daysBetween} days (~${(daysBetween / 365).toFixed(1)} solar years), ` +
          `${countBetween} occurrences (expected: ~12)`
        );
      }
    }

    return dates;
  };

  return (
    <div className="birthday-container">
      <div className="birthday-list">
        <h3>🎂 Lunar Birthdays ({birthdays.length})</h3>
        {birthdays.length === 0 ? (
          <p className="no-birthdays">No birthdays tracked yet. Add your first one!</p>
        ) : (
          <ul className="birthdays-list">
            {birthdays.map((birthday) => (
              <li
                key={birthday.id}
                className={`birthday-item ${getUpcomingBirthday(birthday.gregorianBirthDate) ? 'upcoming' : ''}`}
              >
                <div className="birthday-icon">🎂</div>
                <div className="birthday-info">
                  <h4>{birthday.name}</h4>
                  <p className="birthday-date">
                    Nepali: {birthday.nepaliDate.day}/{birthday.nepaliDate.month}/{birthday.nepaliDate.year}
                    {birthday.isTithiBased && birthday.tithiNumber && (
                      <span className="tithi-badge"> 🌙 {TITHI_NAMES[birthday.tithiNumber - 1]}</span>
                    )}
                  </p>
                  <p className="birthday-gregorian">
                    Born: {birthday.gregorianBirthDate.day}/{birthday.gregorianBirthDate.month}/
                    {birthday.gregorianBirthDate.year} (Age: {getAge(birthday.gregorianBirthDate.year)})
                  </p>
                </div>
                {birthday.reminder?.enabled && <div className="reminder-badge">🔔 Reminder on</div>}
                {birthday.isTithiBased && <div className="tithi-badge">🌙 Tithi-based</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ➕ Add Birthday
        </button>
      ) : (
        <div className="form-container">
          <h3>Track a Lunar Birthday</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Person Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="date-mode-selector">
              <label>Birth Date Input Mode:</label>
              <div className="mode-buttons">
                <button
                  type="button"
                  className={`mode-button ${dateInputMode === 'gregorian' ? 'active' : ''}`}
                  onClick={() => setDateInputMode('gregorian')}
                >
                  📆 Gregorian Date
                </button>
                <button
                  type="button"
                  className={`mode-button ${dateInputMode === 'nepali' ? 'active' : ''}`}
                  onClick={() => setDateInputMode('nepali')}
                >
                  🌙 Nepali Date
                </button>
              </div>
            </div>

            {dateInputMode === 'gregorian' ? (
              <div className="form-section">
                <h4>📆 Gregorian Birth Date</h4>
                <p className="form-hint">Enter your birth date in the Gregorian calendar</p>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="gregorianYear">Year</label>
                    <input
                      type="number"
                      id="gregorianYear"
                      name="gregorianYear"
                      value={formData.gregorianYear}
                      onChange={handleInputChange}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gregorianMonth">Month (1-12)</label>
                    <input
                      type="number"
                      id="gregorianMonth"
                      name="gregorianMonth"
                      value={formData.gregorianMonth}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gregorianDay">Day</label>
                    <input
                      type="number"
                      id="gregorianDay"
                      name="gregorianDay"
                      value={formData.gregorianDay}
                      onChange={handleInputChange}
                      min="1"
                      max="31"
                    />
                  </div>
                </div>
                <div className="auto-converted">
                  <p className="converted-label">Nepali Date (Auto-converted):</p>
                  <p className="converted-value">
                    {formData.nepaliDay}/{formData.nepaliMonth}/{formData.nepaliYear}
                  </p>
                  {formData.tithiNumber > 0 && (
                    <p className="tithi-info">
                      🌙 Tithi: <strong>{TITHI_NAMES[formData.tithiNumber - 1]}</strong> (Lunar Day {formData.tithiNumber})
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="form-section">
                <h4>🌙 Nepali Birth Date (Lunar Calendar)</h4>
                <p className="form-hint">Enter your birth date in the Nepali calendar (Bikram Sambat)</p>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nepaliYear">Year (BS)</label>
                    <input
                      type="number"
                      id="nepaliYear"
                      name="nepaliYear"
                      value={formData.nepaliYear}
                      onChange={handleInputChange}
                      min="1992"
                      max="2090"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nepaliMonth">Month (1-12)</label>
                    <input
                      type="number"
                      id="nepaliMonth"
                      name="nepaliMonth"
                      value={formData.nepaliMonth}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nepaliDay">Day</label>
                    <input
                      type="number"
                      id="nepaliDay"
                      name="nepaliDay"
                      value={formData.nepaliDay}
                      onChange={handleInputChange}
                      min="1"
                      max="32"
                    />
                  </div>
                </div>
                <div className="auto-converted">
                  <p className="converted-label">Gregorian Date (Auto-converted):</p>
                  <p className="converted-value">
                    {formData.gregorianDay}/{formData.gregorianMonth}/{formData.gregorianYear}
                  </p>
                  {formData.tithiNumber > 0 && (
                    <p className="tithi-info">
                      🌙 Tithi: <strong>{TITHI_NAMES[formData.tithiNumber - 1]}</strong> (Lunar Day {formData.tithiNumber})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Show 3-occurrence preview for tithi-based birthdays */}
            {saveBirthdayMode === 'tithi' && formData.tithiNumber > 0 && (
              <div className="tithi-preview">
                <h4>🌙 Next Occurrences of This Tithi</h4>
                <p className="preview-hint">
                  Your birthday will occur on these dates (each ~11-13 months apart) when you celebrate by {TITHI_NAMES[formData.tithiNumber - 1]}:
                </p>
                <div className="preview-dates">
                  {getNextThreeYearsTithiDates(formData.tithiNumber).map((date, index) => (
                    <div key={index} className="preview-date-item">
                      <span className="preview-date">
                        {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="preview-day-name">
                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="save-mode-selector">
              <label>Birthday Celebration Type:</label>
              <div className="mode-buttons">
                <button
                  type="button"
                  className={`mode-button ${saveBirthdayMode === 'date' ? 'active' : ''}`}
                  onClick={() => setSaveBirthdayMode('date')}
                >
                  📅 By Calendar Date
                </button>
                <button
                  type="button"
                  className={`mode-button ${saveBirthdayMode === 'tithi' ? 'active' : ''}`}
                  onClick={() => setSaveBirthdayMode('tithi')}
                >
                  🌙 By Lunar Day (Tithi)
                </button>
              </div>
              <p className="form-hint">
                {saveBirthdayMode === 'date'
                  ? 'Birthday will be celebrated on the same calendar date every year'
                  : `Birthday will be celebrated on ${formData.tithiNumber > 0 ? TITHI_NAMES[formData.tithiNumber - 1] : 'the lunar day'} every lunar month`}
              </p>
            </div>

            {/* Show preview of next tithi occurrences */}
            {saveBirthdayMode === 'tithi' && formData.tithiNumber > 0 && (
              <div className="form-section">
                <h4>📅 Next 3 Lunar Birthday Occurrences</h4>
                <p className="form-hint">
                  Based on your birth date ({formData.gregorianMonth}/{formData.gregorianDay}/{formData.gregorianYear}),
                  your lunar birthday ({TITHI_NAMES[formData.tithiNumber - 1]}) will occur on these dates:
                </p>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}>
                  {(() => {
                    const nextDates = getNextThreeYearsTithiDates(formData.tithiNumber);

                    if (nextDates.length === 0) {
                      return <p style={{ color: '#666' }}>No future occurrences found.</p>;
                    }

                    return (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {nextDates.map((date, index) => (
                          <li key={index} style={{
                            padding: '10px 0',
                            borderBottom: index < nextDates.length - 1 ? '1px solid #e0e0e0' : 'none'
                          }}>
                            <strong>Occurrence {index + 1}:</strong> {date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                            {index > 0 && (
                              <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                                (≈ {Math.round((nextDates[index].getTime() - nextDates[index - 1].getTime()) / (1000 * 60 * 60 * 24))} days from previous)
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="form-group checkbox">
              <label htmlFor="reminderEnabled">
                <input
                  type="checkbox"
                  id="reminderEnabled"
                  name="reminderEnabled"
                  checked={formData.reminderEnabled}
                  onChange={handleInputChange}
                />
                Remind me 1 day before birthday
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Add Birthday
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BirthdayTracker;
