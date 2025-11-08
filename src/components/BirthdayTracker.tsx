import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { nepaliToGregorian, gregorianToNepali } from '../utils/nepaliCalendar.js';
import './BirthdayTracker.css';

const BirthdayTracker: React.FC = () => {
  const { addBirthday, birthdays } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [dateInputMode, setDateInputMode] = useState<'nepali' | 'gregorian'>('gregorian');
  const [formData, setFormData] = useState({
    name: '',
    nepaliYear: 2050,
    nepaliMonth: 1,
    nepaliDay: 1,
    gregorianYear: 1990,
    gregorianMonth: 1,
    gregorianDay: 1,
    reminderEnabled: true,
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
      });
      setShowForm(false);
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
                  </p>
                  <p className="birthday-gregorian">
                    Born: {birthday.gregorianBirthDate.day}/{birthday.gregorianBirthDate.month}/
                    {birthday.gregorianBirthDate.year} (Age: {getAge(birthday.gregorianBirthDate.year)})
                  </p>
                </div>
                {birthday.reminder?.enabled && <div className="reminder-badge">🔔 Reminder on</div>}
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
