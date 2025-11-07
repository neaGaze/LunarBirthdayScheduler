# Nepali Calendar Google Calendar Plugin

A powerful plugin to sync Nepali calendar dates, festivals, and lunar birthdays with Google Calendar.

## Features

✨ **Tithi & Festival Syncing**
- Automatically sync Nepali calendar tithis (lunar days) to your Google Calendar
- Major festivals like Dashain, Tihar, Teej, and more are pre-configured
- Festival events display in your calendar with descriptions

📅 **Custom Event Management**
- Add custom Nepali calendar events
- Support for both Gregorian and Nepali date input
- Automatic conversion between calendar systems

🎂 **Lunar Birthday Tracking**
- Track birthdays based on the Nepali lunar calendar
- Automatically calculates when lunar birthdays occur in the Gregorian calendar each year
- Set reminders for upcoming birthdays

🔔 **Smart Reminders**
- Configurable reminder notifications via Google Calendar
- Customize reminder timing (1 day before, 1 hour before, etc.)
- Multiple reminder methods supported (email, notification, popup)

🔄 **Bidirectional Sync**
- Sync Nepali calendar events to Google Calendar
- Update events in sync
- One-click unsync if needed

## Architecture

The plugin consists of several core services:

### 1. **GoogleCalendarService** (`src/services/googleCalendarService.ts`)
Handles all Google Calendar API operations:
- OAuth 2.0 authentication
- Event CRUD operations
- Calendar management

### 2. **NepaliEventService** (`src/services/nepaliEventService.ts`)
Manages Nepali calendar events:
- Festival database
- Custom event management
- Lunar birthday tracking
- Conversion to Google Calendar format

### 3. **SyncService** (`src/services/syncService.ts`)
Coordinates synchronization:
- Syncs events to Google Calendar
- Handles event updates
- Manages sync mappings

### 4. **NepaliCalendar Utils** (`src/utils/nepaliCalendar.ts`)
Utility functions for:
- Gregorian ↔ Nepali date conversion
- Tithi calculations
- Festival information

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Google Cloud Project with Calendar API enabled
- Google OAuth 2.0 credentials

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nepali-calendar
npm install
```

### 2. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Google Calendar API**
4. Create OAuth 2.0 credentials:
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Choose "Web application"
   - Set Authorized redirect URIs (e.g., `http://localhost:3000/callback`)
5. Copy your Client ID and Client Secret

### 3. Environment Configuration

Create a `.env.local` file in your project root:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
VITE_REDIRECT_URI=http://localhost:3000/callback
```

### 4. Run the Application

**Development:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

## Usage Examples

### Basic Setup
```typescript
import {
  GoogleCalendarService,
  NepaliEventService,
  SyncService
} from './src/index';

// Initialize services
const googleCalendarService = new GoogleCalendarService({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  redirectUri: 'http://localhost:3000/callback',
  apiKey: ''
});

const nepaliEventService = new NepaliEventService();
const syncService = new SyncService(googleCalendarService, nepaliEventService);
```

### OAuth Authentication
```typescript
// Get authorization URL
const authUrl = googleCalendarService.getAuthorizationUrl();
// Redirect user to authUrl

// After user grants permission, exchange code for token
const { accessToken } = await googleCalendarService.exchangeCodeForToken(code);
googleCalendarService.setAccessToken(accessToken);
```

### Sync Events to Google Calendar
```typescript
const syncConfig = {
  calendarId: 'primary',
  syncFestivals: true,
  syncCustomEvents: true,
  syncBirthdays: true,
  daysInAdvance: 90
};

const result = await syncService.syncToGoogleCalendar(syncConfig);
console.log(`Synced ${result.successCount} events`);
```

### Add a Custom Nepali Event
```typescript
const customEvent = nepaliEventService.addEvent({
  title: 'Family Gathering',
  nepaliDate: { year: 2080, month: 7, day: 15 },
  description: 'Annual family gathering',
  isFestival: false,
  isLunarEvent: false,
  reminder: {
    enabled: true,
    minutesBefore: 1440 // 1 day before
  }
});
```

### Add a Lunar Birthday
```typescript
const birthday = nepaliEventService.addLunarBirthday({
  name: 'John Doe',
  nepaliDate: { year: 2050, month: 3, day: 10 },
  gregorianBirthDate: { year: 1994, month: 6, day: 25 },
  reminder: {
    enabled: true,
    minutesBefore: 1440
  }
});
```

### Get Festivals
```typescript
const festivals = nepaliEventService.getFestivals(2080); // For Nepali year 2080
festivals.forEach(festival => {
  console.log(`${festival.title}: ${festival.gregorianDate.day}/${festival.gregorianDate.month}/${festival.gregorianDate.year}`);
});
```

## API Reference

### GoogleCalendarService Methods

- `getAuthorizationUrl()` - Get OAuth 2.0 authorization URL
- `exchangeCodeForToken(code)` - Exchange auth code for access token
- `refreshAccessToken()` - Refresh expired access token
- `setAccessToken(token)` - Set access token
- `createEvent(calendarId, event)` - Create a new calendar event
- `getEvents(calendarId, timeMin, timeMax)` - Fetch events for date range
- `updateEvent(calendarId, eventId, event)` - Update an event
- `deleteEvent(calendarId, eventId)` - Delete an event
- `getCalendars()` - Get user's calendars

### NepaliEventService Methods

- `getFestivals(nepaliYear?)` - Get all festivals
- `addEvent(event)` - Add custom event
- `getEvents()` - Get all custom events
- `updateEvent(id, updates)` - Update event
- `deleteEvent(id)` - Delete event
- `addLunarBirthday(birthday)` - Add lunar birthday
- `getLunarBirthdays()` - Get all lunar birthdays
- `getUpcomingLunarBirthdays(gregorianYear)` - Get birthdays for a year
- `getEventsForDateRange(start, end)` - Get events in date range

### SyncService Methods

- `syncToGoogleCalendar(config)` - Sync Nepali events to Google Calendar
- `unsyncFromGoogleCalendar(config)` - Remove synced events from Google Calendar
- `getSyncedEventMappings()` - Get event ID mappings
- `restoreSyncedEventMappings(mappings)` - Restore saved mappings

## Major Nepali Festivals Included

- **Prithvi Jayanti** - Nepal Foundation Day (Baisakh 1)
- **Teej** - Festival for women (Shrawan 16)
- **Dashain** - Major Hindu festival (Ashoj 1-15)
- **Tihar** - Festival of lights (Kartik 1-5)
- **Chhath** - Sun worship festival (Kartik 20)
- **Maha Shivaratri** - Lord Shiva's night (Falgun 14)
- **Holi** - Festival of colors (Falgun 15)

## Data Storage

The plugin uses:
- **Google Calendar**: For synced events and persistence
- **LocalStorage**: For user preferences and settings (in frontend)
- **In-memory**: For temporary data (services reinitialize on load)

For production use, consider adding a backend database for:
- User preferences
- Sync mappings
- Custom events and birthdays

## Calendar System Notes

- **Nepali Calendar**: Bikram Sambat (BS) - lunisolar calendar
- **Gregorian Calendar**: AD - solar calendar
- **Tithi**: Lunar day (1-30), doesn't align with calendar days
- **Lunar Year**: ~354 days vs Gregorian ~365 days

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### OAuth Not Working
- Verify redirect URI matches in Google Cloud Console
- Check client ID and secret are correct
- Ensure Calendar API is enabled in Google Cloud Project

### Events Not Syncing
- Verify calendar ID (use 'primary' for default calendar)
- Check access token is still valid
- Review sync error messages in console

### Date Conversion Issues
- Use ISO 8601 format for Gregorian dates
- Verify Nepali date is within supported range (1992 BS - 2090 BS)
- Check timezone settings

## Future Enhancements

- [ ] Real-time sync with WebSocket support
- [ ] Mobile app support (React Native)
- [ ] Advanced tithi calculations with astronomical precision
- [ ] Multi-language support
- [ ] Integration with other calendar services (Outlook, Apple Calendar)
- [ ] Offline support with service workers
- [ ] Backend API for data persistence
- [ ] Advanced recurrence patterns (e.g., "every 2nd Tuesday")

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions, please create an issue on GitHub or contact the maintainers.

---

Built with ❤️ for the Nepali community
