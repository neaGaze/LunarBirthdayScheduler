import React, { createContext, useContext, useState, useCallback } from 'react';
import { GoogleCalendarService } from '../services/googleCalendarService.js';
import { NepaliEventService } from '../services/nepaliEventService.js';
import { SyncService } from '../services/syncService.js';
import type { NepaliCalendarEvent, LunarBirthday } from '../services/nepaliEventService.js';
import type { SyncConfig } from '../services/syncService.js';
import { supabase } from '../services/supabaseClient';
import * as SupabaseService from '../services/supabaseService';

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  user: { email?: string } | null;
  login: () => Promise<void>;
  logout: () => void;
  handleOAuthCallback: (code: string) => Promise<void>;

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

  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const login = useCallback(async () => {
    try {
      // Get from window global or environment
      const clientId = (window as any).VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = (window as any).VITE_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
      const redirectUri = (window as any).VITE_REDIRECT_URI || process.env.VITE_REDIRECT_URI;

      console.log('Login attempt with credentials:', {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'missing',
        clientSecret: clientSecret ? 'present' : 'missing',
        redirectUri: redirectUri || 'missing'
      });

      if (!clientId || !clientSecret) {
        throw new Error('Missing Google OAuth credentials (clientId or clientSecret)');
      }

      const service = new GoogleCalendarService({
        clientId,
        clientSecret,
        redirectUri: redirectUri || 'http://localhost:3000/callback',
        apiKey: '',
      });

      const authUrl = service.getAuthorizationUrl();
      console.log('Generated auth URL:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error in AppContext:', error);
      showNotification('error', `Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [showNotification]);

  const handleOAuthCallback = useCallback(async (code: string) => {
    try {
      const clientId = (window as any).VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = (window as any).VITE_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
      const redirectUri = (window as any).VITE_REDIRECT_URI || process.env.VITE_REDIRECT_URI;

      const service = new GoogleCalendarService({
        clientId,
        clientSecret,
        redirectUri,
        apiKey: '',
      });

      const { accessToken } = await service.exchangeCodeForToken(code);
      service.setAccessToken(accessToken);

      // Store token in localStorage (in production, use secure storage)
      localStorage.setItem('google_access_token', accessToken);

      setGoogleCalendarService(service);
      if (nepaliEventService) {
        setSyncService(new SyncService(service, nepaliEventService));
      }

      setIsAuthenticated(true);
      setUser({ email: 'User' });
      showNotification('success', 'Successfully logged in!');
    } catch (error) {
      console.error('OAuth error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      showNotification('error', `Authentication failed: ${errorMsg}`);
    }
  }, [nepaliEventService, showNotification]);

  const logout = useCallback(() => {
    localStorage.removeItem('google_access_token');
    setGoogleCalendarService(null);
    setSyncService(null);
    setIsAuthenticated(false);
    setUser(null);
    showNotification('info', 'Logged out successfully');
  }, [showNotification]);

  const addEvent = useCallback(
    async (event: Omit<NepaliCalendarEvent, 'id' | 'gregorianDate'>) => {
      if (nepaliEventService) {
        const newEvent = nepaliEventService.addEvent(event);
        const updated = [...events, newEvent];
        setEvents(updated);

        // Write to localStorage (always)
        localStorage.setItem('nepali_events', JSON.stringify(updated));

        // Write to Supabase (if authenticated)
        if (supabaseUserId) {
          try {
            await SupabaseService.createEvent(newEvent, supabaseUserId);
            console.log('Event saved to Supabase:', newEvent.id);
          } catch (error) {
            console.error('Failed to save event to Supabase:', error);
            // Don't show error to user, localStorage is primary for now
          }
        }

        showNotification('success', `Event "${event.title}" created successfully`);
      }
    },
    [events, nepaliEventService, supabaseUserId, showNotification]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<NepaliCalendarEvent>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateEvent(id, updates);
        if (updated) {
          const newEvents = events.map((e) => (e.id === id ? updated : e));
          setEvents(newEvents);

          // Write to localStorage (always)
          localStorage.setItem('nepali_events', JSON.stringify(newEvents));

          // Write to Supabase (if authenticated)
          if (supabaseUserId) {
            try {
              await SupabaseService.updateEvent(id, updates);
              console.log('Event updated in Supabase:', id);
            } catch (error) {
              console.error('Failed to update event in Supabase:', error);
            }
          }

          showNotification('success', 'Event updated successfully');
        }
      }
    },
    [events, nepaliEventService, supabaseUserId, showNotification]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (nepaliEventService) {
        nepaliEventService.deleteEvent(id);
        const newEvents = events.filter((e) => e.id !== id);
        setEvents(newEvents);

        // Delete from localStorage (always)
        localStorage.setItem('nepali_events', JSON.stringify(newEvents));

        // Delete from Supabase (if authenticated)
        if (supabaseUserId) {
          try {
            await SupabaseService.deleteEvent(id);
            console.log('Event deleted from Supabase:', id);
          } catch (error) {
            console.error('Failed to delete event from Supabase:', error);
          }
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
    [events, nepaliEventService, supabaseUserId, syncService, googleCalendarService, showNotification]
  );

  const addBirthday = useCallback(
    async (birthday: Omit<LunarBirthday, 'id'>) => {
      if (nepaliEventService) {
        const newBirthday = nepaliEventService.addLunarBirthday(birthday);
        const updated = [...birthdays, newBirthday];
        setBirthdays(updated);

        // Write to localStorage (always)
        localStorage.setItem('nepali_birthdays', JSON.stringify(updated));

        // Write to Supabase (if authenticated)
        if (supabaseUserId) {
          try {
            await SupabaseService.createBirthday(newBirthday, supabaseUserId);
            console.log('Birthday saved to Supabase:', newBirthday.id);
          } catch (error) {
            console.error('Failed to save birthday to Supabase:', error);
          }
        }

        showNotification('success', `Birthday for "${birthday.name}" added successfully`);
      }
    },
    [birthdays, nepaliEventService, supabaseUserId, showNotification]
  );

  const updateBirthday = useCallback(
    async (id: string, updates: Partial<LunarBirthday>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateLunarBirthday(id, updates);
        if (updated) {
          const newBirthdays = birthdays.map((b) => (b.id === id ? updated : b));
          setBirthdays(newBirthdays);

          // Write to localStorage (always)
          localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));

          // Write to Supabase (if authenticated)
          if (supabaseUserId) {
            try {
              await SupabaseService.updateBirthday(id, updates);
              console.log('Birthday updated in Supabase:', id);
            } catch (error) {
              console.error('Failed to update birthday in Supabase:', error);
            }
          }

          showNotification('success', 'Birthday updated successfully');
        }
      }
    },
    [birthdays, nepaliEventService, supabaseUserId, showNotification]
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

        // Delete from localStorage (always)
        localStorage.setItem('nepali_birthdays', JSON.stringify(newBirthdays));

        // Delete from Supabase (if authenticated)
        if (supabaseUserId) {
          try {
            await SupabaseService.deleteBirthday(id);
            console.log('Birthday deleted from Supabase:', id);
          } catch (error) {
            console.error('Failed to delete birthday from Supabase:', error);
          }
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

  // Check Supabase auth session on mount
  React.useEffect(() => {
    const checkSupabaseAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Supabase Auth] Session check:', session ? 'Found session' : 'No session');

        if (session?.user) {
          console.log('[Supabase Auth] User ID:', session.user.id);

          // Get or create user in database
          const dbUser = await SupabaseService.getOrCreateUser(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name
          );

          setSupabaseUserId(dbUser.id);
          console.log('[Supabase Auth] User ID set:', dbUser.id);
        } else {
          console.log('[Supabase Auth] No user in session');
        }
      } catch (error) {
        console.error('[Supabase Auth] Error checking auth:', error);
      }
    };

    checkSupabaseAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] State change event:', event);
      if (session?.user) {
        console.log('[Supabase Auth] Authenticated:', session.user.email);
        const dbUser = await SupabaseService.getOrCreateUser(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name
        );
        setSupabaseUserId(dbUser.id);
      } else {
        console.log('[Supabase Auth] Logged out');
        setSupabaseUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check for existing token on mount
  React.useEffect(() => {
    const existingToken = localStorage.getItem('google_access_token');
    if (existingToken) {
      console.log('Found existing token in localStorage, marking as authenticated');
      setIsAuthenticated(true);
      setUser({ email: 'User' });

      // Re-initialize services with the token
      try {
        const clientId = (window as any).VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = (window as any).VITE_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = (window as any).VITE_REDIRECT_URI || process.env.VITE_REDIRECT_URI;

        const service = new GoogleCalendarService({
          clientId,
          clientSecret,
          redirectUri,
          apiKey: '',
        });

        service.setAccessToken(existingToken);
        setGoogleCalendarService(service);

        if (nepaliEventService) {
          setSyncService(new SyncService(service, nepaliEventService));
        }
      } catch (error) {
        console.error('Error initializing services with cached token:', error);
      }
    }
  }, [nepaliEventService]);

  // Load festivals on mount
  React.useEffect(() => {
    setFestivals(nepaliEventService.getFestivals());
  }, [nepaliEventService]);

  // Load events and birthdays from localStorage on mount
  React.useEffect(() => {
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
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  const value: AppContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    handleOAuthCallback,
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
