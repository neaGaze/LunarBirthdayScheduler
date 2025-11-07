# Quick Start Guide - Nepali Calendar Plugin

Get up and running in 5 minutes! ⚡

## 📋 Prerequisites

- Node.js 16+ (`node --version`)
- npm 7+ (`npm --version`)
- Google Account

## 🚀 5-Minute Setup

### 1. Get Google Credentials (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Nepali Calendar"
3. Enable **Google Calendar API**
4. Create **OAuth 2.0 Web** credentials
5. Add authorized redirect URI: `http://localhost:3000/callback`
6. Copy **Client ID** and **Client Secret**

### 2. Install Project (1 minute)

```bash
cd nepali-calendar
npm install
```

### 3. Configure Environment (30 seconds)

Create `.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=paste_your_client_id_here
VITE_GOOGLE_CLIENT_SECRET=paste_your_client_secret_here
VITE_REDIRECT_URI=http://localhost:3000/callback
```

### 4. Build & Test (1 minute 30 seconds)

```bash
npm run build
```

✅ If you see no errors, you're done!

## 📚 Quick Examples

### Basic Usage

```typescript
import {
  GoogleCalendarService,
  NepaliEventService,
  SyncService
} from './src/index';

// Initialize
const google = new GoogleCalendarService({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  redirectUri: 'http://localhost:3000/callback',
  apiKey: ''
});

const nepali = new NepaliEventService();
const sync = new SyncService(google, nepali);

// Get festivals
const festivals = nepali.getFestivals(2081);
console.log(festivals);

// Add custom event
const event = nepali.addEvent({
  title: 'Family Dinner',
  nepaliDate: { year: 2081, month: 7, day: 15 },
  isFestival: false,
  isLunarEvent: false,
  description: 'Celebration dinner'
});

// Add lunar birthday
const birthday = nepali.addLunarBirthday({
  name: 'Ramchandra',
  nepaliDate: { year: 2050, month: 3, day: 10 },
  gregorianBirthDate: { year: 1994, month: 6, day: 25 }
});

// Sync to Google Calendar (after OAuth)
await sync.syncToGoogleCalendar({
  calendarId: 'primary',
  syncFestivals: true,
  syncCustomEvents: true,
  syncBirthdays: true,
  daysInAdvance: 90
});
```

### Convert Dates

```typescript
import { gregorianToNepali, nepaliToGregorian } from './src/utils/nepaliCalendar';

// AD to BS
const nepaliDate = gregorianToNepali({ year: 2024, month: 11, day: 7 });
console.log(`${nepaliDate.year}-${nepaliDate.month}-${nepaliDate.day}`); // 2081-7-22

// BS to AD
const gregorianDate = nepaliToGregorian({ year: 2081, month: 7, day: 15 });
console.log(`${gregorianDate.year}-${gregorianDate.month}-${gregorianDate.day}`); // 2024-10-31
```

### OAuth Login Flow

```typescript
// Step 1: Get login URL
const authUrl = google.getAuthorizationUrl();
console.log(authUrl); // Direct user to this URL

// Step 2: Handle callback
// In your callback handler, extract the 'code' parameter from URL
const code = new URLSearchParams(location.search).get('code');

// Step 3: Exchange for token
const { accessToken } = await google.exchangeCodeForToken(code);

// Step 4: Use the token
google.setAccessToken(accessToken);

// Now you can use the services!
```

## 🎯 Key Features at a Glance

| Feature | Method | Example |
|---------|--------|---------|
| **Get Festivals** | `nepali.getFestivals()` | See all festivals |
| **Add Event** | `nepali.addEvent()` | Create custom event |
| **Add Birthday** | `nepali.addLunarBirthday()` | Track lunar birthday |
| **Convert Date** | `gregorianToNepali()` | Convert calendar dates |
| **Sync to Google** | `sync.syncToGoogleCalendar()` | Push to Google Calendar |
| **Create Event** | `google.createEvent()` | Add to Google Calendar |
| **Get Events** | `google.getEvents()` | Fetch from Google Calendar |

## 📁 Project Structure

```
✨ Key Files:
├── src/services/
│   ├── googleCalendarService.ts  ← Google Calendar API
│   ├── nepaliEventService.ts     ← Nepali event management
│   └── syncService.ts            ← Synchronization
├── src/utils/
│   └── nepaliCalendar.ts         ← Calendar math
├── README.md                     ← Full documentation
└── SETUP_GUIDE.md               ← Detailed setup
```

## 🔧 Available Commands

```bash
npm run build   # Compile TypeScript
npm run dev     # Start development server (if UI added)
npm test        # Run tests (when added)
```

## 📞 Troubleshooting

### "Cannot find client ID"
→ Check `.env.local` file exists and has correct values

### "Redirect URI mismatch"
→ Update both in `.env.local` AND Google Cloud Console

### "Calendar API not enabled"
→ Go to Google Cloud Console, APIs, enable Google Calendar API

### "Compilation errors"
→ Run `npm install` again, check Node.js version

## 🎓 Next Steps

1. **Build Frontend UI** - Create React components using the services
2. **Implement OAuth** - Use `getAuthorizationUrl()` and `exchangeCodeForToken()`
3. **Add Event Management** - Create forms for adding/editing events
4. **Setup Reminders** - Configure reminder settings
5. **Deploy** - Push to production

## 📖 Learn More

- **Full Documentation** → [README.md](./README.md)
- **Detailed Setup** → [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Full Project Info** → [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **Code Examples** → [src/example.ts](./src/example.ts)

## 🎉 You're Ready!

Your Nepali Calendar plugin is compiled and ready to integrate. Start building your UI and syncing those calendars!

---

**Questions?** Check the full documentation files or refer to the inline code comments.
