import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { nepaliToGregorian } from '../utils/nepaliCalendar.js';
import './EventForm.css';

const EventForm: React.FC = () => {
  const { addEvent, events } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    nepaliYear: 2081,
    nepaliMonth: 1,
    nepaliDay: 1,
    description: '',
    isLunar: false,
    reminderEnabled: true,
    reminderMinutes: 1440,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : name.includes('Minutes') || name.includes('Month') || name.includes('Year') || name.includes('Day') ? parseInt(value) : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    try {
      const nepaliDate = {
        year: formData.nepaliYear,
        month: formData.nepaliMonth,
        day: formData.nepaliDay,
      };

      const gregorianDate = nepaliToGregorian(nepaliDate);

      addEvent({
        title: formData.title,
        nepaliDate,
        description: formData.description,
        isFestival: false,
        isLunarEvent: formData.isLunar,
        reminder: {
          enabled: formData.reminderEnabled,
          minutesBefore: formData.reminderMinutes,
        },
      });

      // Reset form
      setFormData({
        title: '',
        nepaliYear: 2081,
        nepaliMonth: 1,
        nepaliDay: 1,
        description: '',
        isLunar: false,
        reminderEnabled: true,
        reminderMinutes: 1440,
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event');
    }
  };

  return (
    <div className="event-form-container">
      <div className="event-list">
        <h3>📝 Your Events ({events.length})</h3>
        {events.length === 0 ? (
          <p className="no-events">No custom events yet. Create your first one!</p>
        ) : (
          <ul className="events-list">
            {events.map((event) => (
              <li key={event.id} className="event-item">
                <div className="event-info">
                  <h4>{event.title}</h4>
                  <p className="event-date">
                    {event.nepaliDate.day}/{event.nepaliDate.month}/{event.nepaliDate.year}
                  </p>
                  {event.description && <p className="event-desc">{event.description}</p>}
                </div>
                {event.reminder?.enabled && (
                  <div className="event-reminder">
                    🔔 {event.reminder.minutesBefore === 1440 ? '1 day' : `${event.reminder.minutesBefore} min`} before
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ➕ Add New Event
        </button>
      ) : (
        <div className="form-container">
          <h3>Create New Event</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Event Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Family Gathering, Festival Celebration"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any notes about this event"
                rows={3}
              />
            </div>

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

            <div className="form-group checkbox">
              <label htmlFor="isLunar">
                <input
                  type="checkbox"
                  id="isLunar"
                  name="isLunar"
                  checked={formData.isLunar}
                  onChange={handleInputChange}
                />
                Lunar event (date changes yearly on Gregorian calendar)
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="reminderEnabled">🔔 Reminder</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="reminderEnabled"
                    checked={formData.reminderEnabled}
                    onChange={handleInputChange}
                  />
                  Enable reminder
                </label>
              </div>
            </div>

            {formData.reminderEnabled && (
              <div className="form-group">
                <label htmlFor="reminderMinutes">Remind me</label>
                <select
                  id="reminderMinutes"
                  name="reminderMinutes"
                  value={formData.reminderMinutes}
                  onChange={handleInputChange}
                >
                  <option value="15">15 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="1440">1 day before</option>
                  <option value="2880">2 days before</option>
                  <option value="10080">1 week before</option>
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Create Event
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

export default EventForm;
