# Nepali Calendar - React Frontend

This is the React frontend for the Nepali Calendar Google Calendar Plugin.

## Project Structure

```
src/
├── components/              # React components
│   ├── Login.tsx           # OAuth login page
│   ├── Calendar.tsx        # Calendar display
│   ├── EventForm.tsx       # Event creation form
│   ├── BirthdayTracker.tsx # Birthday management
│   ├── Settings.tsx        # Settings & sync
│   └── Notification.tsx    # Toast notifications
├── context/
│   └── AppContext.tsx      # Global state management
├── services/               # Backend services (copied from src/)
│   ├── googleCalendarService.ts
│   ├── nepaliEventService.ts
│   └── syncService.ts
├── utils/                  # Utilities (copied from src/)
│   └── nepaliCalendar.ts
├── App.tsx                 # Main app component
├── main.tsx                # React entry point
├── index.css               # Global styles
└── App.css                 # App-specific styles
```

## Features Included

- ✅ **Authentication**: Google OAuth 2.0 login
- ✅ **Calendar Display**: Interactive calendar showing festivals, events, and birthdays
- ✅ **Event Management**: Create, edit, delete custom Nepali calendar events
- ✅ **Birthday Tracking**: Track lunar birthdays with yearly calculations
- ✅ **Settings & Sync**: Configure and sync events to Google Calendar
- ✅ **Notifications**: Toast notifications for actions
- ✅ **Responsive Design**: Mobile-friendly interface

## Components Overview

### Login Component
- Displays features and OAuth login button
- Handles OAuth callback
- Shows before authentication

### Calendar Component
- Interactive monthly calendar view
- Shows Nepali dates alongside Gregorian dates
- Displays festivals, events, and birthdays
- Color-coded event indicators

### EventForm Component
- Create custom events
- Set reminders
- Display list of created events
- Support for lunar (yearly) events

### BirthdayTracker Component
- Add lunar birthdays
- Track age and birth dates
- Set reminders
- Show upcoming birthdays

### Settings Component
- Configure sync settings
- View event statistics
- Manage account
- About section

## Using the Components

### Within React App

All components are ready to use within the React app:

```tsx
import Calendar from './components/Calendar';
import EventForm from './components/EventForm';
import BirthdayTracker from './components/BirthdayTracker';
import Settings from './components/Settings';
```

### Using Context

Access global state with the `useApp` hook:

```tsx
import { useApp } from './context/AppContext';

function MyComponent() {
  const { events, birthdays, festivals, syncEvents } = useApp();
  // Use the data...
}
```

## Styling

- **CSS Modules**: Each component has its own CSS file
- **Global Styles**: `index.css` for global styles
- **Variables**: CSS custom properties for colors and spacing

### Color Theme

```css
--primary: #ff6b6b       /* Red/Pink */
--secondary: #4ecdc4     /* Teal */
--success: #51cf66       /* Green */
--warning: #ffd43b       /* Yellow */
--dark: #2c3e50          /* Dark gray */
--light: #f5f5f5         /* Light gray */
```

## Setup

### 1. Environment Variables

Create `.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_REDIRECT_URI=http://localhost:3000/callback
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build (if needed)

```bash
npm run build-backend  # Compile backend services
```

### 4. Run with a Local Server

Since Vite was removed, you'll need to serve the frontend using another method:

**Option A: Using Python (if installed)**
```bash
cd /path/to/project
python -m http.server 3000
```

**Option B: Using Node.js with http-server**
```bash
npm install -g http-server
http-server . -p 3000 -o
```

**Option C: Using VS Code Live Server**
- Install the Live Server extension in VS Code
- Right-click on `index.html` → "Open with Live Server"

## Next Steps for Full Integration

To run this as a complete Vite application:

1. **Reinstall Vite** (fix the patch-package issue):
   ```bash
   npm install vite @vitejs/plugin-react --save-dev
   ```

2. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview"
     }
   }
   ```

3. **Run dev server**:
   ```bash
   npm run dev
   ```

## Component API

### useApp() Hook

Access global state:

```typescript
const {
  // Auth
  isAuthenticated,
  user,
  login,
  logout,

  // Services
  googleCalendarService,
  nepaliEventService,
  syncService,

  // Events
  events,
  festivals,
  addEvent,
  updateEvent,
  deleteEvent,

  // Birthdays
  birthdays,
  addBirthday,
  updateBirthday,
  deleteBirthday,

  // Sync
  isSyncing,
  syncResult,
  syncEvents,

  // UI
  activeTab,
  setActiveTab,
  notification,
  showNotification
} = useApp();
```

## Tips & Tricks

1. **Add New Components**:
   - Create `.tsx` file in `src/components/`
   - Import in `App.tsx`
   - Add navigation button in `app-nav`

2. **Customize Colors**:
   - Edit CSS variables in `src/index.css`
   - All components use these variables

3. **Add More Events**:
   - Edit `src/utils/nepaliCalendar.ts`
   - Add festivals to `NEPALI_FESTIVALS` array

4. **Debug State**:
   - Use browser DevTools React extension
   - Add `console.log` in components
   - Check AppContext for state updates

## Known Limitations

1. **Only Primary Calendar**: Google Calendar API integration limited to primary calendar
2. **No OAuth Refresh**: Tokens don't automatically refresh (refresh on reload)
3. **Local Storage Only**: No backend persistence (data lost on refresh)
4. **Limited Astronomical Calculations**: Tithi calculations are simplified

## Future Enhancements

- [ ] Integrate with Vite for hot module reload
- [ ] Add more detail to tithi calculations
- [ ] Implement backend API for data persistence
- [ ] Add more Nepali festivals
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Export/import events
- [ ] Calendar sharing

## Support

For issues or questions:
1. Check the main README.md
2. Review the code comments
3. Check browser console for errors
4. Verify Google Cloud credentials

---

**Happy coding!** 🎉
