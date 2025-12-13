import React, { createContext, useContext, useState, useCallback } from 'react';
import { GoogleCalendarService } from '../services/googleCalendarService.js';
import { NepaliEventService } from '../services/nepaliEventService.js';
import { SyncService } from '../services/syncService.js';
import type { NepaliCalendarEvent, LunarBirthday } from '../services/nepaliEventService.js';
import type { SyncConfig } from '../services/syncService.js';
import { supabase } from '../services/supabaseClient';
import * as SupabaseService from '../services/supabaseService';
import { withRetry, isOnline } from '../utils/retry';

interface SyncStatus {
  isLoading: boolean;
  lastSynced: Date | null;
  error: string | null;
  source: 'localStorage' | 'supabase' | null;
}

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  user: { email?: string } | null;
  supabaseUserId: string | null;
  supabaseAccessToken: string | null;
  logout: () => void;

  // Services
  googleCalendarService: GoogleCalendarService | null;
  nepaliEventService: NepaliEventService | null;
  syncService: SyncService | null;

  // Events
  events: NepaliCalendarEvent[];
  festivals: NepaliCalendarEvent[];
  addEvent: (event: Omit<NepaliCalendarEvent, 'id' | 'gregorianDate'>) => void;
  updateEvent: (id: string, updates: Partial<NepaliCalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Birthdays
  birthdays: LunarBirthday[];
  addBirthday: (birthday: Omit<LunarBirthday, 'id'>) => void;
  updateBirthday: (id: string, updates: Partial<LunarBirthday>) => void;
  deleteBirthday: (id: string) => void;

  // Sync
  isSyncing: boolean;
  syncResult: { success: number; failed: number; message?: string; errors?: string[] } | null;
  syncEvents: (config: SyncConfig) => Promise<void>;

  // Data sync status
  dataSyncStatus: SyncStatus;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseAccessToken, setSupabaseAccessToken] = useState<string | null>(null);
  const [googleCalendarService, setGoogleCalendarService] =
    useState<GoogleCalendarService | null>(null);
  const [nepaliEventService] = useState(() => new NepaliEventService());
  const [syncService, setSyncService] = useState<SyncService | null>(null);

  const [events, setEvents] = useState<NepaliCalendarEvent[]>([]);
  const [festivals, setFestivals] = useState<NepaliCalendarEvent[]>([]);
  const [birthdays, setBirthdays] = useState<LunarBirthday[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: number;
    failed: number;
    message?: string;
    errors?: string[];
  } | null>(null);

  const [dataSyncStatus, setDataSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSynced: null,
    error: null,
    source: null,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);


  const logout = useCallback(async () => {
    console.log('[AppContext] Logout started');

    // Clear Supabase session storage
    localStorage.removeItem('sb-rjhuockfdeaenlvizzoa-auth-token');
    sessionStorage.removeItem('sb-rjhuockfdeaenlvizzoa-auth-token');

    // Sign out from Supabase (fire and forget)
    supabase.auth.signOut().catch((error) => {
      console.warn('[AppContext] Supabase signout error (ignored):', error);
    });

    // Immediately clear all local state
    console.log('[AppContext] Clearing local state');
    localStorage.removeItem('google_access_token');
    setGoogleCalendarService(null);
    setSyncService(null);
    setIsAuthenticated(false);
    setUser(null);
    setSupabaseUserId(null);
    showNotification('info', 'Logged out successfully');
    console.log('[AppContext] Logout complete');
  }, [showNotification]);

  const addEvent = useCallback(
    async (event: Omit<NepaliCalendarEvent, 'id' | 'gregorianDate'>) => {
      console.log('[addEvent] Called, supabaseUserId:', supabaseUserId);
      if (nepaliEventService) {
        const newEvent = nepaliEventService.addEvent(event);
        console.log('[addEvent] Created event with id:', newEvent.id);
        const updated = [...events, newEvent];
        setEvents(updated);

        // If authenticated, Supabase is primary; localStorage is cache
        if (supabaseUserId && supabaseAccessToken) {
          try {
            console.log('[addEvent] Saving to Supabase...');
            await SupabaseService.createEvent(newEvent, supabaseUserId, supabaseAccessToken);
            console.log('[Supabase] Event saved:', newEvent.id);
            // Update localStorage cache
            localStorage.setItem('nepali_events', JSON.stringify(updated));
          } catch (error) {
            console.error('[Supabase] Failed to save event:', error);
            showNotification('error', 'Failed to save to cloud. Data saved locally.');
            localStorage.setItem('nepali_events', JSON.stringify(updated));
          }
        } else {
          // Not authenticated - localStorage only
          console.log('[addEvent] No supabaseUserId, saving to localStorage only');
          localStorage.setItem('nepali_events', JSON.stringify(updated));
        }

        showNotification('success', `Event "${event.title}" created successfully`);
      }
    },
    [events, nepaliEventService, supabaseUserId, supabaseAccessToken, showNotification]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<NepaliCalendarEvent>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateEvent(id, updates);
        if (updated) {
          const newEvents = events.map((e) => (e.id === id ? updated : e));
          setEvents(newEvents);

          // If authenticated, Supabase is primary; localStorage is cache
          if (supabaseUserId) {
            try {
              await SupabaseService.updateEvent(id, updates);
              console.log('[Supabase] Event updated:', id);
              localStorage.setItem('nepali_events', JSON.stringify(newEvents));
            } catch (error) {
              console.error('[Supabase] Failed to update event:', error);
              showNotification('error', 'Failed to update in cloud. Saved locally.');
              localStorage.setItem('nepali_events', JSON.stringify(newEvents));
            }
          } else {
            localStorage.setItem('nepali_events', JSON.stringify(newEvents));
          }

          showNotification('success', 'Event updated successfully');
        }
      }
    },
    [events, nepaliEventService, supabaseUserId, showNotification]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      console.log('[deleteEvent] Called with id:', id, 'supabaseUserId:', supabaseUserId);
      if (nepaliEventService) {
        nepaliEventService.deleteEvent(id);
        const newEvents = events.filter((e) => e.id !== id);
        setEvents(newEvents);

        // If authenticated, Supabase is primary; localStorage is cache
        if (supabaseUserId && supabaseAccessToken) {
          try {
            console.log('[deleteEvent] Deleting from Supabase...');
            await SupabaseService.deleteEvent(id, supabaseAccessToken);
            console.log('[Supabase] Event deleted:', id);
            localStorage.setItem('nepali_events', JSON.stringify(newEvents));
          } catch (error) {
            console.error('[Supabase] Failed to delete event:', error);
            showNotification('error', 'Failed to delete from cloud. Deleted locally.');
            localStorage.setItem('nepali_events', JSON.stringify(newEvents));
          }
        } else {
          console.log('[deleteEvent] No supabaseUserId/token, only deleting locally');
          localStorage.setItem('nepali_events', JSON.stringify(newEvents));
        }

        // Delete from Google Calendar if synced
        if (syncService && googleCalendarService) {
          try {
            const googleEventId = syncService.getSyncedGoogleEventId(id);
            if (googleEventId) {
              const calendarId = localStorage.getItem('nepali_calendar_id');
              if (calendarId) {
                await googleCalendarService.deleteEvent(calendarId, googleEventId);
                showNotification('success', 'Event deleted from Google Calendar');
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to delete from Google Calendar:', errorMessage);
            showNotification('error', 'Event deleted locally but not from Google Calendar');
          }
        }

        showNotification('success', 'Event deleted successfully');
      }
    },
    [events, nepaliEventService, supabaseUserId, supabaseAccessToken, syncService, googleCalendarService, showNotification]
  );

  const addBirthday = useCallback(
    async (birthday: Omit<LunarBirthday, 'id'>) => {
      if (nepaliEventService) {
        const newBirthday = nepaliEventService.addLunarBirthday(birthday);
        const updated = [...birthdays, newBirthday];
        setBirthdays(updated);

        // If authenticated, Supabase is primary; localStorage is cache
        if (supabaseUserId) {
          try {
            await SupabaseService.createBirthday(newBirthday, supabaseUserId);
            console.log('[Supabase] Birthday saved:', newBirthday.id);
            localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
          } catch (error) {
            console.error('[Supabase] Failed to save birthday:', error);
            showNotification('error', 'Failed to save to cloud. Data saved locally.');
            localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
          }
        } else {
          localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
        }

        showNotification('success', `Birthday for "${birthday.name}" added successfully`);

        // Auto-sync to Google Calendar if authenticated
        if (syncService && googleCalendarService) {
          try {
            const calendarId = localStorage.getItem('nepali_calendar_id') || 'primary';
            const savedConfig = localStorage.getItem('nepali_sync_config');
            const config = savedConfig ? JSON.parse(savedConfig) : {
              calendarId,
              syncFestivals: true,
              syncCustomEvents: true,
              syncBirthdays: true,
              daysInAdvance: 90,
              maxBirthdaysToSync: 3,
            };
            config.calendarId = calendarId;

            console.log('[Auto-sync] Syncing new birthday to Google Calendar...');
            const result = await syncService.syncToGoogleCalendar(config);
            if (result.failureCount === 0) {
              console.log('[Auto-sync] Birthday synced to Google Calendar');
            } else {
              console.warn('[Auto-sync] Some events failed to sync:', result.errors);
            }
          } catch (error) {
            console.error('[Auto-sync] Failed to sync to Google Calendar:', error);
          }
        }
      }
    },
    [birthdays, nepaliEventService, supabaseUserId, showNotification, syncService, googleCalendarService]
  );

  const updateBirthday = useCallback(
    async (id: string, updates: Partial<LunarBirthday>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateLunarBirthday(id, updates);
        if (updated) {
          const newBirthdays = birthdays.map((b) => (b.id === id ? updated : b));
          setBirthdays(newBirthdays);

          // If authenticated, Supabase is primary; localStorage is cache
          if (supabaseUserId) {
            try {
              await SupabaseService.updateBirthday(id, updates);
              console.log('[Supabase] Birthday updated:', id);
              localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
            } catch (error) {
              console.error('[Supabase] Failed to update birthday:', error);
              showNotification('error', 'Failed to update in cloud. Saved locally.');
              localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
            }
          } else {
            localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
          }

          showNotification('success', 'Birthday updated successfully');

          // Auto-sync to Google Calendar if authenticated
          if (syncService && googleCalendarService) {
            try {
              const calendarId = localStorage.getItem('nepali_calendar_id') || 'primary';
              const savedConfig = localStorage.getItem('nepali_sync_config');
              const config = savedConfig ? JSON.parse(savedConfig) : {
                calendarId,
                syncFestivals: true,
                syncCustomEvents: true,
                syncBirthdays: true,
                daysInAdvance: 90,
                maxBirthdaysToSync: 3,
              };
              config.calendarId = calendarId;

              console.log('[Auto-sync] Syncing updated birthday to Google Calendar...');
              const result = await syncService.syncToGoogleCalendar(config);
              if (result.failureCount === 0) {
                console.log('[Auto-sync] Birthday synced to Google Calendar');
              } else {
                console.warn('[Auto-sync] Some events failed to sync:', result.errors);
              }
            } catch (error) {
              console.error('[Auto-sync] Failed to sync to Google Calendar:', error);
            }
          }
        }
      }
    },
    [birthdays, nepaliEventService, supabaseUserId, showNotification, syncService, googleCalendarService]
  );

  const deleteBirthday = useCallback(
    async (id: string) => {
      if (nepaliEventService) {
        console.log('========== DELETE BIRTHDAY START ==========');
        console.log('Birthday ID:', id);
        console.log('syncService exists:', !!syncService);
        console.log('googleCalendarService exists:', !!googleCalendarService);

        nepaliEventService.deleteLunarBirthday(id);
        const newBirthdays = birthdays.filter((b) => b.id !== id);
        setBirthdays(newBirthdays);

        // If authenticated, Supabase is primary; localStorage is cache
        if (supabaseUserId) {
          try {
            await SupabaseService.deleteBirthday(id);
            console.log('[Supabase] Birthday deleted:', id);
            localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
          } catch (error) {
            console.error('[Supabase] Failed to delete birthday:', error);
            showNotification('error', 'Failed to delete from cloud. Deleted locally.');
            localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
          }
        } else {
          localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));
        }

        // Delete from Google Calendar if synced (handles multiple events for tithi birthdays)
        if (syncService && googleCalendarService) {
          try {
            const calendarId = localStorage.getItem('nepali_calendar_id');
            console.log('Calendar ID from localStorage:', calendarId);

            if (calendarId) {
              let deletedCount = 0;

              // Try deleting the base event
              const googleEventId = syncService.getSyncedGoogleEventId(id);
              console.log(`Base event ID (${id}) -> Google ID:`, googleEventId);

              if (googleEventId) {
                console.log('Deleting base event from Google Calendar...');
                await googleCalendarService.deleteEvent(calendarId, googleEventId);
                deletedCount++;
                console.log('Base event deleted successfully');
              }

              // For tithi birthdays, also delete year-specific events (id_2026, id_2027, etc.)
              const currentYear = new Date().getFullYear();
              console.log(`Checking year-specific events from ${currentYear} to ${currentYear + 9}`);

              for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
                const yearEventId = `${id}_${currentYear + yearOffset}`;
                const googleYearEventId = syncService.getSyncedGoogleEventId(yearEventId);
                console.log(`  Year ${currentYear + yearOffset} (${yearEventId}) -> Google ID:`, googleYearEventId);

                if (googleYearEventId) {
                  console.log(`  Deleting year ${currentYear + yearOffset} event...`);
                  await googleCalendarService.deleteEvent(calendarId, googleYearEventId);
                  deletedCount++;
                  console.log(`  Deleted successfully`);
                }
              }

              console.log(`Total events deleted from Google Calendar: ${deletedCount}`);

              if (deletedCount > 0) {
                showNotification('success', `Deleted ${deletedCount} event(s) from Google Calendar`);
              } else {
                console.log('No events found in sync mappings to delete');
                showNotification('info', 'Birthday deleted locally (not synced to Google Calendar)');
              }
            } else {
              console.log('No calendar ID found in localStorage');
              showNotification('info', 'Birthday deleted locally (no calendar ID)');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to delete from Google Calendar:', errorMessage);
            showNotification('error', 'Birthday deleted locally but not from Google Calendar');
          }
        } else {
          console.log('syncService or googleCalendarService not available');
          showNotification('info', 'Birthday deleted locally (not authenticated)');
        }

        showNotification('success', 'Birthday deleted successfully');
        console.log('========== DELETE BIRTHDAY END ==========');
      }
    },
    [birthdays, nepaliEventService, supabaseUserId, syncService, googleCalendarService, showNotification]
  );

  const syncEvents = useCallback(
    async (config: SyncConfig) => {
      if (!syncService || !googleCalendarService || !nepaliEventService) {
        showNotification('error', 'Not authenticated. Please log in first.');
        return;
      }

      setIsSyncing(true);
      try {
        // Sync current state events and birthdays back to the service
        // Clear the service's events
        const currentEvents = nepaliEventService.getEvents();
        currentEvents.forEach(event => {
          nepaliEventService.deleteEvent(event.id);
        });

        // Add all events from state to the service
        events.forEach(event => {
          nepaliEventService.addEvent({
            title: event.title,
            nepaliDate: event.nepaliDate,
            description: event.description,
            isFestival: event.isFestival,
            isLunarEvent: event.isLunarEvent,
            reminder: event.reminder,
            recurring: event.recurring
          });
        });

        // Sync birthdays: Instead of deleting and re-adding (which creates new IDs),
        // directly update the service to match the current state
        console.log('[Sync] Preserving birthday IDs during sync...');
        console.log('[Sync] State birthday IDs:', birthdays.map(b => b.id));
        const currentBirthdays = nepaliEventService.getLunarBirthdays();
        const currentBirthdayIds = new Set(currentBirthdays.map(b => b.id));
        const stateBirthdayIds = new Set(birthdays.map(b => b.id));

        // Remove birthdays that are in service but not in state
        currentBirthdays.forEach(birthday => {
          if (!stateBirthdayIds.has(birthday.id)) {
            nepaliEventService.deleteLunarBirthday(birthday.id);
          }
        });

        // Add or update birthdays from state
        birthdays.forEach(birthday => {
          if (currentBirthdayIds.has(birthday.id)) {
            // Update existing birthday
            nepaliEventService.updateLunarBirthday(birthday.id, {
              name: birthday.name,
              nepaliDate: birthday.nepaliDate,
              gregorianBirthDate: birthday.gregorianBirthDate,
              reminder: birthday.reminder,
              isTithiBased: birthday.isTithiBased,
              tithiNumber: birthday.tithiNumber
            });
          } else {
            // Add new birthday - but we need to preserve the ID!
            // This is a workaround: we'll use the service's internal map directly
            const birthdayWithId = {
              id: birthday.id,
              name: birthday.name,
              nepaliDate: birthday.nepaliDate,
              gregorianBirthDate: birthday.gregorianBirthDate,
              reminder: birthday.reminder,
              isTithiBased: birthday.isTithiBased,
              tithiNumber: birthday.tithiNumber
            };
            // Access the internal map (hacky but necessary to preserve IDs)
            (nepaliEventService as any).lunarBirthdays.set(birthday.id, birthdayWithId);
          }
        });

        const result = await syncService.syncToGoogleCalendar(config);

        // Store the calendar ID for later use in birthday deletion
        localStorage.setItem('nepali_calendar_id', config.calendarId);

        setSyncResult({
          success: result.successCount,
          failed: result.failureCount,
          message: `Synced ${result.successCount} events. ${result.failureCount} failed.`,
          errors: result.errors
        });
        showNotification(
          result.failureCount === 0 ? 'success' : 'error',
          result.failureCount === 0
            ? `Successfully synced ${result.successCount} events!`
            : `Synced ${result.successCount} events with ${result.failureCount} failures`
        );
      } catch (error) {
        console.error('Sync error:', error);
        showNotification('error', 'Failed to sync events');
      } finally {
        setIsSyncing(false);
      }
    },
    [syncService, googleCalendarService, nepaliEventService, events, birthdays, showNotification]
  );

  // Initialize Supabase user ID - use device/browser ID as fallback
  React.useEffect(() => {
    const initializeSupabaseUser = async () => {
      try {
        // First, try to get existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('[Supabase] Using authenticated user:', session.user.id);
          console.log('[Supabase] Provider token exists:', !!session.provider_token);
          console.log('[Supabase] Access token exists:', !!session.access_token);
          setSupabaseUserId(session.user.id);
          setSupabaseAccessToken(session.access_token);
          setIsAuthenticated(true);
          setUser({ email: session.user.email });

          // Initialize Google Calendar service if we have a provider token
          if (session.provider_token) {
            console.log('[Google Calendar] Initializing with existing provider token');
            const gcService = new GoogleCalendarService({
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
              clientSecret: '',
              redirectUri: window.location.origin,
              apiKey: '',
            });
            gcService.setAccessToken(session.provider_token);
            setGoogleCalendarService(gcService);

            // Initialize sync service
            const newSyncService = new SyncService(gcService, nepaliEventService);
            setSyncService(newSyncService);
            console.log('[Google Calendar] Services initialized from existing session');
          }
        } else {
          // No auth session - don't use Supabase
          console.log('[Supabase] No auth session, using localStorage only');
          setSupabaseUserId(null);
        }
      } catch (error) {
        console.error('[Supabase] Error initializing user:', error);
      }
    };

    initializeSupabaseUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] State change event:', event);
      if (session?.user) {
        console.log('[Supabase] Authenticated user:', session.user.id);
        console.log('[Supabase] Provider token exists:', !!session.provider_token);
        console.log('[Supabase] Access token exists:', !!session.access_token);
        setSupabaseUserId(session.user.id);
        setSupabaseAccessToken(session.access_token);
        setIsAuthenticated(true);
        setUser({ email: session.user.email });

        // Initialize Google Calendar service if we have a provider token
        if (session.provider_token) {
          console.log('[Google Calendar] Initializing with provider token');
          const gcService = new GoogleCalendarService({
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            clientSecret: '',
            redirectUri: window.location.origin,
            apiKey: '',
          });
          gcService.setAccessToken(session.provider_token);
          setGoogleCalendarService(gcService);

          // Initialize sync service
          const newSyncService = new SyncService(gcService, nepaliEventService);
          setSyncService(newSyncService);
          console.log('[Google Calendar] Services initialized');
        }

        // Ensure user exists in users table (for foreign key constraint)
        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (!existingUser && (!checkError || checkError.code === 'PGRST116')) {
            // User doesn't exist, create it
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || 'User',
                google_id: session.user.id,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
              });

            if (insertError) {
              console.error('[Supabase] Error creating user record:', insertError);
            } else {
              console.log('[Supabase] User record created:', session.user.id);
            }
          }
        } catch (error) {
          console.error('[Supabase] Error ensuring user exists:', error);
        }
      } else {
        console.log('[Supabase] No authenticated user');
        setSupabaseUserId(null);
        setIsAuthenticated(false);
        setUser(null);
        setGoogleCalendarService(null);
        setSyncService(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Load festivals on mount
  React.useEffect(() => {
    setFestivals(nepaliEventService.getFestivals());
  }, [nepaliEventService]);

  // Load events and birthdays - from Supabase if authenticated, else localStorage
  React.useEffect(() => {
    const loadData = async () => {
      // If authenticated with Supabase, load from there
      if (supabaseUserId) {
        setDataSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));

        // Check if online before trying Supabase
        if (!isOnline()) {
          console.log('[AppContext] Offline, loading from localStorage cache');
          loadFromLocalStorage();
          setDataSyncStatus({
            isLoading: false,
            lastSynced: null,
            error: 'Offline - using cached data',
            source: 'localStorage',
          });
          return;
        }

        try {
          console.log('[AppContext] Loading data from Supabase for user:', supabaseUserId);

          // Use retry logic for network resilience
          const [supabaseEvents, supabaseBirthdays] = await withRetry(
            async () => Promise.all([
              SupabaseService.getEvents(supabaseUserId),
              SupabaseService.getBirthdays(supabaseUserId),
            ]),
            { maxRetries: 3, delayMs: 1000 }
          );

          console.log('[AppContext] Loaded from Supabase:', {
            events: supabaseEvents.length,
            birthdays: supabaseBirthdays.length,
          });

          setEvents(supabaseEvents);
          setBirthdays(supabaseBirthdays);

          // Also update localStorage as cache
          localStorage.setItem('nepali_events', JSON.stringify(supabaseEvents));
          localStorage.setItem('nepali_birthdays', JSON.stringify(supabaseBirthdays));

          setDataSyncStatus({
            isLoading: false,
            lastSynced: new Date(),
            error: null,
            source: 'supabase',
          });
        } catch (error) {
          console.error('[AppContext] Error loading from Supabase after retries, falling back to localStorage:', error);
          setDataSyncStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load from cloud, using local data'
          }));

          // Fallback to localStorage
          loadFromLocalStorage();
          setDataSyncStatus(prev => ({ ...prev, source: 'localStorage' }));
        }
      } else {
        // Not authenticated - load from localStorage only
        loadFromLocalStorage();
        setDataSyncStatus({
          isLoading: false,
          lastSynced: null,
          error: null,
          source: 'localStorage',
        });
      }
    };

    const loadFromLocalStorage = () => {
      try {
        const savedEvents = localStorage.getItem('nepali_events');
        if (savedEvents) {
          setEvents(JSON.parse(savedEvents));
        }

        const savedBirthdays = localStorage.getItem('nepali_birthdays');
        if (savedBirthdays) {
          setBirthdays(JSON.parse(savedBirthdays));
        }
      } catch (error) {
        console.error('[AppContext] Error loading from localStorage:', error);
      }
    };

    loadData();
  }, [supabaseUserId]);

  // Real-time subscriptions for multi-device sync
  React.useEffect(() => {
    if (!supabaseUserId) return;

    console.log('[AppContext] Setting up real-time subscriptions');

    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${supabaseUserId}`,
        },
        (payload) => {
          console.log('[Realtime] Events change:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newEvent = SupabaseService.dbToEvent(payload.new as any);
            setEvents((prev) => {
              // Avoid duplicates
              if (prev.some((e) => e.id === newEvent.id)) return prev;
              const updated = [...prev, newEvent];
              localStorage.setItem('nepali_events', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedEvent = SupabaseService.dbToEvent(payload.new as any);
            setEvents((prev) => {
              const updated = prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
              localStorage.setItem('nepali_events', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setEvents((prev) => {
              const updated = prev.filter((e) => e.id !== deletedId);
              localStorage.setItem('nepali_events', JSON.stringify(updated));
              return updated;
            });
          }

          setDataSyncStatus((prev) => ({ ...prev, lastSynced: new Date() }));
        }
      )
      .subscribe();

    const birthdaysChannel = supabase
      .channel('birthdays-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'birthdays',
          filter: `user_id=eq.${supabaseUserId}`,
        },
        (payload) => {
          console.log('[Realtime] Birthdays change:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newBirthday = SupabaseService.dbToBirthday(payload.new as any);
            setBirthdays((prev) => {
              // Avoid duplicates
              if (prev.some((b) => b.id === newBirthday.id)) return prev;
              const updated = [...prev, newBirthday];
              localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedBirthday = SupabaseService.dbToBirthday(payload.new as any);
            setBirthdays((prev) => {
              const updated = prev.map((b) => (b.id === updatedBirthday.id ? updatedBirthday : b));
              localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setBirthdays((prev) => {
              const updated = prev.filter((b) => b.id !== deletedId);
              localStorage.setItem('nepali_birthdays', JSON.stringify(updated));
              return updated;
            });
          }

          setDataSyncStatus((prev) => ({ ...prev, lastSynced: new Date() }));
        }
      )
      .subscribe();

    return () => {
      console.log('[AppContext] Cleaning up real-time subscriptions');
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(birthdaysChannel);
    };
  }, [supabaseUserId]);

  const value: AppContextType = {
    isAuthenticated,
    user,
    supabaseUserId,
    supabaseAccessToken,
    logout,
    googleCalendarService,
    nepaliEventService,
    syncService,
    events,
    festivals,
    addEvent,
    updateEvent,
    deleteEvent,
    birthdays,
    addBirthday,
    updateBirthday,
    deleteBirthday,
    isSyncing,
    syncResult,
    syncEvents,
    dataSyncStatus,
    activeTab,
    setActiveTab,
    notification,
    showNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
