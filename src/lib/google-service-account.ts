import { google } from 'googleapis';

export class GoogleServiceAccountCalendar {
  private calendar: any;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
        private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createMeetingWithGoogleMeet(eventData: any) {
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
      attendees: eventData.attendees.map((email: string) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const result = await this.calendar.events.insert({
      calendarId: 'primary', // Service account's calendar
      resource: event,
      conferenceDataVersion: 1
    });

    return {
      eventId: result.data.id,
      meetLink: result.data.conferenceData?.entryPoints?.[0]?.uri || result.data.hangoutLink || '',
      htmlLink: result.data.htmlLink
    };
  }
}