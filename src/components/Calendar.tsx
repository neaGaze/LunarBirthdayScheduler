import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { gregorianToNepali, nepaliToGregorian } from '../utils/nepaliCalendar.js';
import './Calendar.css';

const Calendar: React.FC = () => {
  const { festivals, events, birthdays } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const gregorianDate = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: day,
      };
      const nepaliDate = gregorianToNepali(gregorianDate);


      // Check for events on this date
      const dayEvents = events.filter(
        (e) =>
          e.gregorianDate.year === gregorianDate.year &&
          e.gregorianDate.month === gregorianDate.month &&
          e.gregorianDate.day === gregorianDate.day
      );

      const dayFestivals = festivals.filter(
        (f) =>
          f.gregorianDate.year === gregorianDate.year &&
          f.gregorianDate.month === gregorianDate.month &&
          f.gregorianDate.day === gregorianDate.day
      );

      const dayBirthdays = birthdays.filter(
        (b) =>
          b.gregorianBirthDate.month === gregorianDate.month &&
          b.gregorianBirthDate.day === gregorianDate.day
      );

      const hasEvent = dayEvents.length > 0 || dayFestivals.length > 0 || dayBirthdays.length > 0;

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasEvent ? 'has-event' : ''} ${
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear()
              ? 'today'
              : ''
          }`}
        >
          <div className="day-dates">
            <div className="day-number">{day}</div>
            <div className="day-nepali">{nepaliDate.month}/{nepaliDate.day}</div>
          </div>

          {hasEvent && (
            <div className="day-events">
              {dayFestivals.map((festival) => (
                <div key={festival.id} className="event festival" title={festival.title}>
                  {festival.title.substring(0, 3)}
                </div>
              ))}
              {dayEvents.map((event) => (
                <div key={event.id} className="event custom" title={event.title}>
                  {event.title.substring(0, 3)}
                </div>
              ))}
              {dayBirthdays.map((birthday) => (
                <div key={birthday.id} className="event birthday" title={birthday.name}>
                  🎂
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="nav-button" onClick={prevMonth}>
          ←
        </button>
        <h2>{monthName}</h2>
        <button className="nav-button" onClick={nextMonth}>
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="calendar-grid">{renderCalendarDays()}</div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color festival"></span>
          Festival
        </div>
        <div className="legend-item">
          <span className="legend-color custom"></span>
          Event
        </div>
        <div className="legend-item">
          <span className="legend-color birthday"></span>
          Birthday
        </div>
      </div>
    </div>
  );
};

export default Calendar;
