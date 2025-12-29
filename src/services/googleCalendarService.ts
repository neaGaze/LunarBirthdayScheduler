/**
 * Google Calendar API Service
 * Handles authentication and calendar operations
 */

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'notification' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  organizer?: {
    email: string;
    displayName?: string;
  };
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiKey: string;
}

export class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
  }

  /**
   * Initiate OAuth 2.0 authentication flow
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    });

    console.log('Exchanging code for token with:', {
      clientId: this.config.clientId.substring(0, 20) + '...',
      redirectUri: this.config.redirectUri,
      codeLength: code.length
    });

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      console.log('Token exchange response status:', response.status);

      const data = await response.json();
      console.log('Token exchange response:', {
        error: data.error,
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token
      });

      if (data.error) {
        throw new Error(`OAuth error: ${data.error} - ${data.error_description || 'No description'}`);
      }

      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      console.log('Token exchange successful');

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('Refresh token not available');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Token refresh error: ${data.error_description}`);
    }

    this.accessToken = data.access_token;
    return data.access_token;
  }

  /**
   * Set access token manually (for stored tokens)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set refresh token manually
   */
  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  /**
   * Create a new calendar event
   */
  async createEvent(calendarId: string, event: CalendarEvent): Promise<CalendarEvent> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // Clean up the event object to remove undefined/null values
    const cleanEvent: any = {
      summary: event.summary,
      start: event.start,
      end: event.end
    };

    if (event.description) {
      cleanEvent.description = event.description;
    }

    if (event.reminders) {
      cleanEvent.reminders = event.reminders;
    }

    if (event.recurrence) {
      cleanEvent.recurrence = event.recurrence;
    }

    if (event.organizer) {
      cleanEvent.organizer = event.organizer;
    }

    console.log('Creating event with data:', JSON.stringify(cleanEvent, null, 2));

    // Log each field separately for debugging
    console.log('Event summary:', cleanEvent.summary);
    console.log('Event start:', JSON.stringify(cleanEvent.start));
    console.log('Event end:', JSON.stringify(cleanEvent.end));
    console.log('Has description:', !!cleanEvent.description);
    console.log('Has reminders:', !!cleanEvent.reminders);
    console.log('Has recurrence:', !!cleanEvent.recurrence);

    const bodyString = JSON.stringify(cleanEvent);
    console.log('Full body length:', bodyString.length, 'bytes');
    console.log('Access token (first 20 chars):', this.accessToken?.substring(0, 20));
    console.log('Calendar ID:', calendarId);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: bodyString
      }
    );

    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      date: response.headers.get('date')
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        console.error('Google Calendar API full error response:', JSON.stringify(error, null, 2));
        if (error.error) {
          console.error('Error details:', error.error);
          errorMessage = error.error.message || error.error;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        const errorText = await response.text();
        console.error('Google Calendar API error (raw):', errorText);
        errorMessage = errorText;
      }
      throw new Error(`Failed to create event: ${errorMessage}`);
    }

    return response.json();
  }

  /**
   * Get events for a date range
   */
  async getEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<CalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get events: ${error.error.message}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: CalendarEvent
  ): Promise<CalendarEvent> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update event: ${error.error.message}`);
    }

    return response.json();
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete event: ${error.error.message}`);
    }
  }

  /**
   * Get user's calendars
   */
  async getCalendars(): Promise<Array<{ id: string; summary: string }>> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get calendars: ${error.error.message}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Find an existing event by title and date
   */
  async findEventByTitleAndDate(
    calendarId: string,
    title: string,
    date: string
  ): Promise<CalendarEvent | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      // Parse the date - could be "YYYY-MM-DD" (all-day) or "YYYY-MM-DDTHH:mm:ss.sssZ" (timed)
      let timeMin: string;
      let timeMax: string;

      if (date.includes('T')) {
        // DateTime format - search around this specific time (±12 hours for safety)
        const eventTime = new Date(date);
        const before = new Date(eventTime);
        before.setHours(before.getHours() - 12);
        const after = new Date(eventTime);
        after.setHours(after.getHours() + 12);
        timeMin = before.toISOString();
        timeMax = after.toISOString();
      } else {
        // Date-only format (all-day event) - search the entire day in UTC
        // For "2025-06-15", we want to search from 2025-06-15T00:00:00Z to 2025-06-16T00:00:00Z
        timeMin = `${date}T00:00:00Z`;
        const dateParts = date.split('-');
        const nextDay = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]) + 1));
        timeMax = nextDay.toISOString();
      }

      console.log(`[GoogleCalendar] Searching for "${title}" between ${timeMin} and ${timeMax}`);

      // Get all events in the time range (without text search filter to be more comprehensive)
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        maxResults: '250' // Get more results to ensure we don't miss the event
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to search events: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const events = data.items || [];

      console.log(`[GoogleCalendar] Found ${events.length} events in date range`);
      if (events.length > 0) {
        console.log('[GoogleCalendar] Event titles:', events.map((e: CalendarEvent) => e.summary));
      }

      // Find exact match by title
      const exactMatch = events.find((e: CalendarEvent) => e.summary === title);

      if (exactMatch) {
        console.log(`[GoogleCalendar] Found exact match with ID: ${exactMatch.id}`);
      } else {
        console.log(`[GoogleCalendar] No exact match found for "${title}"`);
      }

      return exactMatch || null;
    } catch (error) {
      console.warn('[GoogleCalendar] Error searching for existing event:', error);
      return null; // Return null on error to allow creation
    }
  }
}
