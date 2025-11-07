# Nepali Calendar Plugin - Setup Guide

This guide will walk you through setting up the Nepali Calendar Google Calendar Plugin step by step.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Project Installation](#project-installation)
4. [Local Development](#local-development)
5. [Integration Steps](#integration-steps)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 16.0 or higher (check with `node --version`)
- **npm** 7.0 or higher (check with `npm --version`)
- A **Google Account** with access to Google Calendar
- Basic knowledge of JavaScript/TypeScript
- A code editor (VS Code recommended)
- Git (optional, for version control)

### Install Node.js

If you don't have Node.js installed:

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version
3. Follow the installation instructions for your OS

Verify installation:
```bash
node --version
npm --version
```

---

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google Account
3. Click the **Project dropdown** at the top
4. Click **NEW PROJECT**
5. Enter project name: `Nepali Calendar Plugin`
6. Click **CREATE**
7. Wait for the project to be created (2-3 minutes)

### Step 2: Enable Google Calendar API

1. In the Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click the **ENABLE** button
5. You'll see "API enabled" confirmation

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** button
3. Select **OAuth 2.0 Client ID**
4. You may be prompted to **Configure consent screen first**:
   - Click **CONFIGURE CONSENT SCREEN**
   - Choose **External** for User Type
   - Click **CREATE**
   - Fill in the OAuth consent screen:
     - App name: `Nepali Calendar Plugin`
     - User support email: (your email)
     - Developer contact: (your email)
   - Click **SAVE AND CONTINUE**
   - On Scopes page, click **ADD OR REMOVE SCOPES**
   - Search for "calendar" and select:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click **UPDATE**
   - Click **SAVE AND CONTINUE**
   - Review and click **SAVE AND CONTINUE**

5. Back to credentials, click **+ CREATE CREDENTIALS** > **OAuth 2.0 Client ID**
6. For Application type, select **Web application**
7. Enter name: `Nepali Calendar Plugin`
8. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `http://localhost:5173` (Vite default)
9. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/callback`
   - `http://localhost:5173/callback`
10. Click **CREATE**
11. A dialog will show your credentials. **Copy and save them** somewhere safe:
    - Client ID
    - Client Secret

### Step 4: Secure Your Credentials

**Never commit credentials to git!**

1. Create a `.env.local` file in your project root
2. Add your credentials:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
VITE_REDIRECT_URI=http://localhost:3000/callback
```

3. Add `.env.local` to your `.gitignore`:
```bash
echo ".env.local" >> .gitignore
```

---

## Project Installation

### Step 1: Clone or Download the Project

```bash
# If using git:
git clone <repository-url>
cd nepali-calendar

# Or download and extract the ZIP file
cd nepali-calendar
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- TypeScript
- React (for UI)
- Development tools

The package.json includes:
- `nepali-calendar-js` - For Nepali/Gregorian date conversions
- TypeScript - For type safety
- Development dependencies

### Step 3: Verify Installation

```bash
npm run build
```

This should compile TypeScript without errors. You should see:
```
Successfully compiled 5 files with tsc
```

---

## Local Development

### Start Development Server

If you plan to build a web frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:3000` (or `http://localhost:5173` if using Vite)

### Project Structure

```
nepali-calendar/
├── src/
│   ├── services/
│   │   ├── googleCalendarService.ts    # Google Calendar API
│   │   ├── nepaliEventService.ts       # Nepali event management
│   │   └── syncService.ts              # Event synchronization
│   ├── utils/
│   │   └── nepaliCalendar.ts           # Calendar conversions & utilities
│   ├── index.ts                        # Main entry point
│   └── example.ts                      # Usage examples
├── dist/                               # Compiled output
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── README.md                           # Full documentation
└── SETUP_GUIDE.md                      # This file
```

---

## Integration Steps

### Step 1: Initialize the Plugin

Create a file `src/app.ts`:

```typescript
import {
  GoogleCalendarService,
  NepaliEventService,
  SyncService
} from './index';

// Initialize services
const googleCalendarService = new GoogleCalendarService({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  redirectUri: import.meta.env.VITE_REDIRECT_URI,
  apiKey: ''
});

const nepaliEventService = new NepaliEventService();
const syncService = new SyncService(googleCalendarService, nepaliEventService);

export { googleCalendarService, nepaliEventService, syncService };
```

### Step 2: Implement OAuth Login

Create `src/auth.ts`:

```typescript
import { googleCalendarService } from './app';

export function getLoginUrl(): string {
  return googleCalendarService.getAuthorizationUrl();
}

export async function handleAuthCallback(code: string): Promise<string> {
  const { accessToken } = await googleCalendarService.exchangeCodeForToken(code);

  // Save token to localStorage (in production, use secure storage)
  localStorage.setItem('google_access_token', accessToken);

  googleCalendarService.setAccessToken(accessToken);
  return accessToken;
}

export function loadStoredToken(): void {
  const token = localStorage.getItem('google_access_token');
  if (token) {
    googleCalendarService.setAccessToken(token);
  }
}
```

### Step 3: Add Sync Functionality

Create `src/syncEvents.ts`:

```typescript
import { syncService, nepaliEventService, googleCalendarService } from './app';
import type { SyncConfig } from './services/syncService';

export async function syncNepaliEventsToGoogle(): Promise<void> {
  const calendars = await googleCalendarService.getCalendars();
  const primaryCalendar = calendars.find(cal => cal.id === 'primary');

  if (!primaryCalendar) {
    throw new Error('Primary calendar not found');
  }

  const config: SyncConfig = {
    calendarId: primaryCalendar.id,
    syncFestivals: true,
    syncCustomEvents: true,
    syncBirthdays: true,
    daysInAdvance: 90
  };

  const result = await syncService.syncToGoogleCalendar(config);

  console.log(`✅ Sync complete!`);
  console.log(`  - Synced: ${result.successCount}`);
  console.log(`  - Failed: ${result.failureCount}`);

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
}
```

---

## Testing

### Run TypeScript Compilation

```bash
npm run build
```

Should complete without errors.

### Test Individual Features

You can test by running TypeScript files:

```bash
# Note: requires node with TypeScript support
npx ts-node src/example.ts
```

### Test in Browser (if building UI)

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000` in your browser
3. Click "Login with Google"
4. Grant permissions
5. Try syncing events

---

## Deployment

### Build for Production

```bash
npm run build
```

This creates optimized files in the `dist/` directory.

### Deploy to Hosting Services

#### Option 1: Vercel (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

#### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

#### Option 3: GitHub Pages
Requires a frontend framework integration.

### Production Environment Variables

1. On your hosting service, set these environment variables:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_CLIENT_SECRET`
   - `VITE_REDIRECT_URI` (update to your production domain)

2. Update redirect URI in Google Cloud Console:
   - Go to **APIs & Services** > **Credentials**
   - Edit OAuth client
   - Add production URLs:
     - `https://yourdomain.com/callback`

---

## Troubleshooting

### Issue: "Client ID not found" Error

**Solution:**
- Verify `.env.local` file exists in project root
- Check credentials are correctly copied from Google Cloud Console
- Restart dev server after adding environment variables

### Issue: "Redirect URI mismatch" Error

**Solution:**
- The redirect URI must match exactly in both:
  1. `.env.local` file
  2. Google Cloud Console credentials
- Include the full URL with protocol (http/https)
- Check for trailing slashes

### Issue: Calendar API not enabled

**Solution:**
- Go to Google Cloud Console
- Select your project
- Go to **APIs & Services** > **Library**
- Search for "Google Calendar API"
- Click **ENABLE**

### Issue: "Permission denied" when creating events

**Solution:**
- User needs to grant calendar write permissions
- Go to **OAuth consent screen** > **Scopes**
- Ensure `calendar` scope is included
- User may need to re-authenticate

### Issue: TypeScript compilation errors

**Solution:**
- Check Node.js version: `node --version` (should be 16+)
- Delete `node_modules` and `package-lock.json`:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Check for any syntax errors in source files

### Issue: Events not syncing

**Solution:**
1. Verify user is authenticated: `googleCalendarService.accessToken`
2. Check calendar ID: `await googleCalendarService.getCalendars()`
3. Review error messages in console
4. Ensure dates are in valid range (2000 BS - 2090 BS)

### Issue: Nepali date conversion incorrect

**Solution:**
- Verify date is within supported range
- Check month value (1-12 for both calendars)
- Use the provided conversion functions
- For exact results, consider using `nepali-calendar-js` library directly

---

## Next Steps

After setup:

1. **Build Frontend UI** - Create React components for:
   - Login button
   - Festival display
   - Event management form
   - Birthday tracker
   - Sync settings

2. **Add Backend** (Optional) - For production:
   - Store user preferences
   - Cache synced events
   - Manage sync mappings
   - Handle webhook updates

3. **Enhance Features**:
   - Add notification system
   - Implement advanced search
   - Create calendar views
   - Add analytics

4. **Deploy to Production**:
   - Set up HTTPS
   - Configure production domain
   - Set up monitoring
   - Create user documentation

---

## Getting Help

- **Documentation**: See [README.md](./README.md)
- **Examples**: Check [src/example.ts](./src/example.ts)
- **API Reference**: In service files docstrings
- **Google Calendar API**: https://developers.google.com/calendar/api/guides
- **Nepali Calendar**: https://github.com/bibhuticoder/nepali-calendar-api

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use HTTPS in production** - Especially for OAuth
3. **Secure token storage** - Use HttpOnly cookies, not localStorage (in production)
4. **Validate user input** - Especially event titles and descriptions
5. **Rate limit API calls** - Avoid hitting quota limits
6. **Use refresh tokens** - For long-lived access
7. **Keep dependencies updated** - Run `npm update` regularly

---

**You're all set!** 🎉

Your Nepali Calendar Google Calendar Plugin is ready to use. Start by running `npm run dev` and begin integrating it into your application.

For questions or issues, refer to the troubleshooting section or check the project documentation.
