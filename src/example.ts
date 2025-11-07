/**
 * Example usage of the Nepali Calendar Plugin
 * This file demonstrates all major features
 */

import { GoogleCalendarService } from './services/googleCalendarService.js';
import { NepaliEventService } from './services/nepaliEventService.js';
import { SyncService } from './services/syncService.js';
import { gregorianToNepali, nepaliToGregorian } from './utils/nepaliCalendar.js';

async function runExample() {
  console.log('🎉 Nepali Calendar Plugin - Example Usage\n');

  // Initialize services
  const googleCalendarService = new GoogleCalendarService({
    clientId: process.env.GOOGLE_CLIENT_ID || 'your_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_client_secret',
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/callback',
    apiKey: ''
  });

  const nepaliEventService = new NepaliEventService();
  const syncService = new SyncService(googleCalendarService, nepaliEventService);

  // Example 1: Date Conversion
  console.log('📅 Example 1: Date Conversion\n');

  const gregorianDate = { year: 2024, month: 11, day: 7 };
  const nepaliDate = gregorianToNepali(gregorianDate);
  console.log(`Gregorian: ${gregorianDate.year}-${gregorianDate.month}-${gregorianDate.day}`);
  console.log(`Nepali:    ${nepaliDate.year}-${nepaliDate.month}-${nepaliDate.day}\n`);

  const nepaliDateInput = { year: 2081, month: 7, day: 15 };
  const gregorianResult = nepaliToGregorian(nepaliDateInput);
  console.log(`Nepali:    ${nepaliDateInput.year}-${nepaliDateInput.month}-${nepaliDateInput.day}`);
  console.log(`Gregorian: ${gregorianResult.year}-${gregorianResult.month}-${gregorianResult.day}\n`);

  // Example 2: Get Major Festivals
  console.log('🏮 Example 2: Major Nepali Festivals\n');

  const festivals = nepaliEventService.getFestivals(2081);
  festivals.slice(0, 5).forEach(festival => {
    const gDate = festival.gregorianDate;
    console.log(
      `✨ ${festival.title}: Nepali ${festival.nepaliDate.day}/${festival.nepaliDate.month}/${festival.nepaliDate.year} (${gDate.day}/${gDate.month}/${gDate.year})`
    );
  });
  console.log(`\n... and ${festivals.length - 5} more festivals\n`);

  // Example 3: Add Custom Event
  console.log('📝 Example 3: Adding Custom Event\n');

  const customEvent = nepaliEventService.addEvent({
    title: 'Family Gathering',
    nepaliDate: { year: 2080, month: 7, day: 15 },
    description: 'Annual family reunion celebration',
    isFestival: false,
    isLunarEvent: false,
    reminder: {
      enabled: true,
      minutesBefore: 1440 // 1 day before
    }
  });

  console.log(`✅ Created event: ${customEvent.title}`);
  console.log(`   ID: ${customEvent.id}`);
  console.log(`   Nepali Date: ${customEvent.nepaliDate.day}/${customEvent.nepaliDate.month}/${customEvent.nepaliDate.year}`);
  console.log(
    `   Gregorian Date: ${customEvent.gregorianDate.day}/${customEvent.gregorianDate.month}/${customEvent.gregorianDate.year}\n`
  );

  // Example 4: Add Lunar Birthday
  console.log('🎂 Example 4: Tracking Lunar Birthdays\n');

  const birthday = nepaliEventService.addLunarBirthday({
    name: 'Ramchandra',
    nepaliDate: { year: 2050, month: 3, day: 10 },
    gregorianBirthDate: { year: 1994, month: 6, day: 25 },
    reminder: {
      enabled: true,
      minutesBefore: 1440
    }
  });

  console.log(`🎉 Added lunar birthday: ${birthday.name}`);
  console.log(`   Nepali Birthday: ${birthday.nepaliDate.day}/${birthday.nepaliDate.month}`);
  console.log(`   Gregorian Birth: ${birthday.gregorianBirthDate.day}/${birthday.gregorianBirthDate.month}/${birthday.gregorianBirthDate.year}\n`);

  // Example 5: Get Events for Date Range
  console.log('📆 Example 5: Events in Date Range\n');

  const startDate = { year: 2024, month: 11, day: 1 };
  const endDate = { year: 2024, month: 12, day: 31 };

  const eventsInRange = nepaliEventService.getEventsForDateRange(startDate, endDate);
  console.log(`Found ${eventsInRange.length} events in range`);
  eventsInRange.slice(0, 3).forEach(event => {
    console.log(
      `  • ${event.title} (${event.gregorianDate.day}/${event.gregorianDate.month}/${event.gregorianDate.year})`
    );
  });

  // Example 6: Update Event
  console.log('\n\n✏️  Example 6: Updating Event\n');

  const updatedEvent = nepaliEventService.updateEvent(customEvent.id, {
    description: 'Updated: Annual family reunion - New location decided'
  });

  if (updatedEvent) {
    console.log(`✅ Updated event: ${updatedEvent.title}`);
    console.log(`   New description: ${updatedEvent.description}\n`);
  }

  // Example 7: Get All Events
  console.log('📋 Example 7: All Custom Events\n');

  const allEvents = nepaliEventService.getEvents();
  console.log(`Total custom events: ${allEvents.length}`);
  allEvents.forEach(event => {
    console.log(
      `  • ${event.title} (${event.nepaliDate.day}/${event.nepaliDate.month}/${event.nepaliDate.year})`
    );
  });

  // Example 8: Get Upcoming Birthdays
  console.log('\n\n🎂 Example 8: Upcoming Lunar Birthdays\n');

  const upcomingBirthdays = nepaliEventService.getUpcomingLunarBirthdays(2024);
  console.log(`Upcoming birthdays in 2024: ${upcomingBirthdays.length}`);
  upcomingBirthdays.forEach(bd => {
    console.log(`  • ${bd.name} - Nepali ${bd.nepaliDate.day}/${bd.nepaliDate.month}`);
  });

  // Example 9: Convert Event to Google Calendar Format
  console.log('\n\n🔄 Example 9: Convert to Google Calendar Format\n');

  if (allEvents.length > 0) {
    const googleEvent = nepaliEventService.convertToGoogleCalendarEvent(allEvents[0]);
    console.log(`Event: ${googleEvent.summary}`);
    console.log(`Description: ${googleEvent.description}`);
    console.log(`Date: ${googleEvent.start.date}`);
    console.log(`Reminders: ${googleEvent.reminders?.overrides?.map(r => `${r.minutes} min before`).join(', ')}\n`);
  }

  // Example 10: OAuth Flow (informational)
  console.log('🔐 Example 10: OAuth 2.0 Authentication Flow\n');

  const authUrl = googleCalendarService.getAuthorizationUrl();
  console.log('Step 1: Get authorization URL');
  console.log(`  ${authUrl.substring(0, 50)}...\n`);

  console.log('Step 2: User grants permission');
  console.log('  (User is redirected to Google login, authorizes the app)\n');

  console.log('Step 3: Exchange code for access token');
  console.log('  await googleCalendarService.exchangeCodeForToken(code);');
  console.log('  (In real application, this happens in callback handler)\n');

  console.log('Step 4: Set the token');
  console.log('  googleCalendarService.setAccessToken(token);\n');

  // Example 11: Sync Configuration
  console.log('⚙️  Example 11: Sync Configuration\n');

  const syncConfig = {
    calendarId: 'primary',
    syncFestivals: true,
    syncCustomEvents: true,
    syncBirthdays: true,
    daysInAdvance: 90
  };

  console.log('Sync Configuration:');
  console.log(`  Calendar ID: ${syncConfig.calendarId}`);
  console.log(`  Sync Festivals: ${syncConfig.syncFestivals}`);
  console.log(`  Sync Custom Events: ${syncConfig.syncCustomEvents}`);
  console.log(`  Sync Birthdays: ${syncConfig.syncBirthdays}`);
  console.log(`  Days in Advance: ${syncConfig.daysInAdvance}\n`);

  console.log('📝 Example 12: Sync Mappings (for persistence)\n');

  const mappings = syncService.getSyncedEventMappings();
  console.log('Synced event mappings:');
  console.log(
    `  ${Object.keys(mappings).length} events synced to Google Calendar (to be populated after actual sync)\n`
  );

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Examples completed successfully!');
  console.log('='.repeat(50) + '\n');

  console.log('📚 Key Features Demonstrated:');
  console.log('  ✨ Date conversion (Gregorian ↔ Nepali)');
  console.log('  🏮 Festival management');
  console.log('  📝 Custom event creation and management');
  console.log('  🎂 Lunar birthday tracking');
  console.log('  📆 Date range queries');
  console.log('  🔄 Google Calendar format conversion');
  console.log('  🔐 OAuth 2.0 authentication flow');
  console.log('  📊 Event synchronization setup\n');

  console.log('🚀 Next Steps:');
  console.log('  1. Set up Google Cloud Project credentials');
  console.log('  2. Implement the React frontend UI');
  console.log('  3. Connect OAuth flow to your app');
  console.log('  4. Sync events to your Google Calendar');
  console.log('  5. Deploy to production!\n');
}

// Run the example
runExample().catch(console.error);
