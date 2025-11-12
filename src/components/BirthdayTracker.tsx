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
   * Calculate when a tithi occurs each year from 1991-2091
   * Finds the occurrence of the tithi closest to the target month/day for each year
   * This creates a 100-year pattern that shows how the birthday date shifts through calendar years
   */
  const calculateYearlyTithiBirthdays = (targetMonth: number, targetDay: number, targetTithiNumber: number): Array<{ year: number; date: Date | null }> => {
    const yearlyDates: Array<{ year: number; date: Date | null }> = [];

    // Search through 100 years from birth year
    for (let year = 1991; year <= 2091; year++) {
      // For each year, find the tithi occurrence closest to the target month/day
      // Search ±180 days around the target month to account for lunar calendar shift
      const targetDate = new Date(year, targetMonth - 1, targetDay);
      let closestDate: Date | null = null;
      let closestDistance = Infinity;

      for (let dayOffset = -180; dayOffset <= 180; dayOffset++) {
        const checkDate = new Date(targetDate);
        checkDate.setDate(checkDate.getDate() + dayOffset);

        // Skip dates outside the target year
        if (checkDate.getFullYear() !== year) {
          continue;
        }

        const tithiCheckDate = {
          year: checkDate.getFullYear(),
          month: checkDate.getMonth() + 1,
          day: checkDate.getDate()
        };

        const tithi = calculateTithi(tithiCheckDate);

        // If this is the target tithi, track if it's the closest to target month
        if (tithi.number === targetTithiNumber) {
          const distance = Math.abs(dayOffset);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestDate = new Date(checkDate);
          }
        }
      }

      yearlyDates.push({ year, date: closestDate });
    }

    return yearlyDates;
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
   * Get next 3 occurrences of a specific tithi using the 100-year yearly pattern
   *
   * Algorithm:
   * 1. Calculate yearly tithi occurrences for all 100 years (1991-2091)
   * 2. This creates a pattern showing how the birthday date shifts through calendar years
   * 3. Find the first 3 future dates from this pattern
   * 4. Dates are naturally spaced ~11-13 months apart (one per calendar year)
   */
  const getNextThreeYearsTithiDates = (tithiNumber: number): Date[] => {
    const today = new Date();
    const dates: Date[] = [];

    // Calculate the yearly pattern for the entire 100-year span
    const yearlyBirthdays = calculateYearlyTithiBirthdays(formData.gregorianMonth, formData.gregorianDay, tithiNumber);

    // Collect the first 3 future occurrences
    for (const yearData of yearlyBirthdays) {
      if (yearData.date && yearData.date > today) {
        dates.push(yearData.date);

        // Stop after finding 3 future dates
        if (dates.length === 3) {
          break;
        }
      }
    }

    // Sanity check: Log the count of tithis between occurrences
    if (dates.length >= 2) {
      const countBetween = countTithiBetweenDates(dates[0], dates[1], tithiNumber);
      console.log(
        `Tithi ${TITHI_NAMES[tithiNumber - 1]} occurrences between ${dates[0].toDateString()} and ${dates[1].toDateString()}: ${countBetween} (expected: 12)`
      );
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
