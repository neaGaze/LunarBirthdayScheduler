import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { gregorianToNepali, nepaliToGregorian, getNepaliMonthName, calculateTithi, TITHI_NAMES, isFestivalOnDate, getFestivalDayName } from '../utils/nepaliCalendar.js';
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
      const tithi = calculateTithi(gregorianDate);

      // Check for events on this date
      const dayEvents = events.filter(
        (e) =>
          e.gregorianDate.year === gregorianDate.year &&
          e.gregorianDate.month === gregorianDate.month &&
          e.gregorianDate.day === gregorianDate.day
      );

      const dayFestivals = festivals.filter((f) => {
        // Check if festival is on this exact day (for first-day reference)
        const isExactDay =
          f.gregorianDate.year === gregorianDate.year &&
          f.gregorianDate.month === gregorianDate.month &&
          f.gregorianDate.day === gregorianDate.day;

        // For multi-day festivals, check if this date falls within the festival range
        const isWithinRange =
          f.festivalDuration?.isMultiDay &&
          isFestivalOnDate(f.title, gregorianDate, nepaliDate.year);

        return isExactDay || isWithinRange;
      });

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
            <div className="day-nepali">{getNepaliMonthName(nepaliDate.month)} {nepaliDate.day}</div>
          </div>
          <div className="day-tithi" title={tithi.name}>
            {tithi.name}
          </div>

          {hasEvent && (
            <div className="day-events">
              {dayFestivals.map((festival) => {
                const festivalDayName = getFestivalDayName(festival.title, nepaliDate.day, nepaliDate.month);
                return (
                  <div key={festival.id} className="event festival" title={festival.title}>
                    {festivalDayName}
                  </div>
                );
              })}
              {dayEvents.map((event) => (
                <div key={event.id} className="event custom" title={event.title}>
                  {event.title}
                </div>
              ))}
              {dayBirthdays.map((birthday) => (
                <div key={birthday.id} className="event birthday" title={birthday.name}>
                  🎂 {birthday.name}
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
          <span className="legend-date">15</span>
          Gregorian Date
        </div>
        <div className="legend-item">
          <span className="legend-nepali">Kartik 15</span>
          Nepali Date
        </div>
        <div className="legend-item">
          <span className="legend-tithi">Pratipad</span>
          Tithi (Lunar Day)
        </div>
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
