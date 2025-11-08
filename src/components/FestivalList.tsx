import React from 'react';
import { useApp } from '../context/AppContext';
import { gregorianToNepali, getNepaliMonthName } from '../utils/nepaliCalendar';
import './FestivalList.css';

const FestivalList: React.FC = () => {
  const { festivals, events, birthdays } = useApp();

  // Use today's date
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Filter festivals for current month
  const monthFestivals = festivals.filter(
    (f) =>
      f.gregorianDate.month === currentMonth &&
      f.gregorianDate.year === currentYear
  );

  // Filter events for current month
  const monthEvents = events.filter(
    (e) =>
      e.gregorianDate.month === currentMonth &&
      e.gregorianDate.year === currentYear
  );

  // Filter birthdays for current month (without year check since they recur yearly)
  const monthBirthdays = birthdays.filter(
    (b) => b.gregorianBirthDate.month === currentMonth
  );

  // Get Nepali month name for display
  const nepaliDate = gregorianToNepali({
    year: currentYear,
    month: currentMonth,
    day: 1,
  });
  const nepaliMonthName = getNepaliMonthName(nepaliDate.month);

  if (monthFestivals.length === 0 && monthEvents.length === 0 && monthBirthdays.length === 0) {
    return null;
  }

  return (
    <div className="festival-list-container">
      <h3 className="festival-list-title">
        {today.toLocaleString('en-US', { month: 'long', year: 'numeric' })} ({nepaliMonthName} {nepaliDate.year})
      </h3>

      {monthFestivals.length > 0 && (
        <div className="festival-section">
          <h4 className="section-title festival-title">🎉 Festivals</h4>
          <ul className="festival-items">
            {monthFestivals.map((festival) => (
              <li key={festival.id} className="festival-item">
                <span className="festival-date">
                  {festival.gregorianDate.day} ({getNepaliMonthName(gregorianToNepali(festival.gregorianDate).month)} {gregorianToNepali(festival.gregorianDate).day})
                </span>
                <span className="festival-name">{festival.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {monthEvents.length > 0 && (
        <div className="festival-section">
          <h4 className="section-title event-title">📅 Events</h4>
          <ul className="festival-items">
            {monthEvents.map((event) => (
              <li key={event.id} className="event-item">
                <span className="festival-date">
                  {event.gregorianDate.day} ({getNepaliMonthName(gregorianToNepali(event.gregorianDate).month)} {gregorianToNepali(event.gregorianDate).day})
                </span>
                <span className="festival-name">{event.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {monthBirthdays.length > 0 && (
        <div className="festival-section">
          <h4 className="section-title birthday-title">🎂 Birthdays</h4>
          <ul className="festival-items">
            {monthBirthdays.map((birthday) => (
              <li key={birthday.id} className="birthday-item">
                <span className="festival-date">
                  {birthday.gregorianBirthDate.day} ({getNepaliMonthName(gregorianToNepali(birthday.gregorianBirthDate).month)} {gregorianToNepali(birthday.gregorianBirthDate).day})
                </span>
                <span className="festival-name">{birthday.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FestivalList;
