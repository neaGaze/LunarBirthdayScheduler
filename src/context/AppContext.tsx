import React, { createContext, useContext, useState, useCallback } from 'react';
import { GoogleCalendarService } from '../services/googleCalendarService.js';
import { NepaliEventService } from '../services/nepaliEventService.js';
import { SyncService } from '../services/syncService.js';
import type { NepaliCalendarEvent, LunarBirthday } from '../services/nepaliEventService.js';
import type { SyncConfig } from '../services/syncService.js';

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
  syncResult: { success: number; failed: number; message?: string } | null;
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
    (event: Omit<NepaliCalendarEvent, 'id' | 'gregorianDate'>) => {
      if (nepaliEventService) {
        const newEvent = nepaliEventService.addEvent(event);
        setEvents([...events, newEvent]);
        showNotification('success', `Event "${event.title}" created successfully`);
      }
    },
    [events, nepaliEventService, showNotification]
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<NepaliCalendarEvent>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateEvent(id, updates);
        if (updated) {
          setEvents(events.map((e) => (e.id === id ? updated : e)));
          showNotification('success', 'Event updated successfully');
        }
      }
    },
    [events, nepaliEventService, showNotification]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      if (nepaliEventService) {
        nepaliEventService.deleteEvent(id);
        setEvents(events.filter((e) => e.id !== id));
        showNotification('success', 'Event deleted successfully');
      }
    },
    [events, nepaliEventService, showNotification]
  );

  const addBirthday = useCallback(
    (birthday: Omit<LunarBirthday, 'id'>) => {
      if (nepaliEventService) {
        const newBirthday = nepaliEventService.addLunarBirthday(birthday);
        setBirthdays([...birthdays, newBirthday]);
        showNotification('success', `Birthday for "${birthday.name}" added successfully`);
      }
    },
    [birthdays, nepaliEventService, showNotification]
  );

  const updateBirthday = useCallback(
    (id: string, updates: Partial<LunarBirthday>) => {
      if (nepaliEventService) {
        const updated = nepaliEventService.updateLunarBirthday(id, updates);
        if (updated) {
          setBirthdays(birthdays.map((b) => (b.id === id ? updated : b)));
          showNotification('success', 'Birthday updated successfully');
        }
      }
    },
    [birthdays, nepaliEventService, showNotification]
  );

  const deleteBirthday = useCallback(
    (id: string) => {
      if (nepaliEventService) {
        nepaliEventService.deleteLunarBirthday(id);
        setBirthdays(birthdays.filter((b) => b.id !== id));
        showNotification('success', 'Birthday deleted successfully');
      }
    },
    [birthdays, nepaliEventService, showNotification]
  );

  const syncEvents = useCallback(
    async (config: SyncConfig) => {
      if (!syncService || !googleCalendarService) {
        showNotification('error', 'Not authenticated. Please log in first.');
        return;
      }

      setIsSyncing(true);
      try {
        const result = await syncService.syncToGoogleCalendar(config);
        setSyncResult({
          success: result.successCount,
          failed: result.failureCount,
          message: `Synced ${result.successCount} events. ${result.failureCount} failed.`,
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
    [syncService, googleCalendarService, showNotification]
  );

  // Check for existing token on mount
  React.useEffect(() => {
    const existingToken = localStorage.getItem('google_access_token');
    if (existingToken) {
      console.log('Found existing token in localStorage, marking as authenticated');
      setIsAuthenticated(true);
      setUser({ email: 'User' });
    }
  }, []);

  // Load festivals on mount
  React.useEffect(() => {
    setFestivals(nepaliEventService.getFestivals());
  }, [nepaliEventService]);

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
