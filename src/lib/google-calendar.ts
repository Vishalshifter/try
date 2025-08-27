interface GoogleMeetEvent {
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description?: string;
}

export class GoogleCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async createAdminService() {
    let adminToken = process.env.ADMIN_GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.ADMIN_GOOGLE_REFRESH_TOKEN;
    
    if (!adminToken) {
      throw new Error('Admin Google access token not configured');
    }
    
    // Try to refresh token if we have refresh token
    if (refreshToken) {
      try {
        const newToken = await GoogleCalendarService.refreshToken(refreshToken);
        adminToken = newToken;
      } catch (error) {
        console.log('Token refresh failed, using existing token');
      }
    }
    
    return new GoogleCalendarService(adminToken);
  }
  
  static async refreshToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error}`);
    }
    
    return data.access_token;
  }

  async createMeetingWithGoogleMeet(eventData: GoogleMeetEvent) {
    const event = {
      summary: eventData.title,
      start: {
        dateTime: new Date(eventData.startTime).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(eventData.endTime).toISOString(),
        timeZone: 'UTC'
      },
      attendees: eventData.attendees.map(email => ({ email })),
      description: eventData.description || '',
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    console.log('Creating calendar event:', event);
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    const result = await response.json();
    console.log('Calendar API response:', result);

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${JSON.stringify(result)}`);
    }
    
    return {
      eventId: result.id,
      meetLink: result.conferenceData?.entryPoints?.[0]?.uri || result.hangoutLink || '',
      htmlLink: result.htmlLink
    };
  }
}