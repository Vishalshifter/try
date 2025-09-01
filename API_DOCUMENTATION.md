# Meeting Assistant API Documentation

## Overview
This API provides endpoints for managing meetings with Google Meet integration, Google Calendar synchronization, email notifications, and Fireflies.ai transcription. The system supports both user-hosted and admin-hosted meetings with automatic transcription capabilities.

## Authentication
All API endpoints require Firebase ID token authentication via Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

---

## 🗓️ Google Calendar Integration Setup

### Prerequisites
1. **Google Cloud Project**: Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable APIs**: Enable Google Calendar API and Gmail API
3. **OAuth 2.0 Credentials**: Create OAuth 2.0 client credentials
4. **Service Account**: Create service account for admin operations

### Step 1: Google Cloud Console Setup

#### 1.1 Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click **Create Credentials > OAuth 2.0 Client IDs**
4. Configure:
   - **Application type**: Web application
   - **Name**: Meeting Assistant
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

#### 1.2 Enable Required APIs
1. Navigate to **APIs & Services > Library**
2. Enable the following APIs:
   - **Google Calendar API**
   - **Gmail API** (for email notifications)
   - **Google Meet API** (if available)

#### 1.3 Create Service Account (Admin Calendar)
1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Configure:
   - **Name**: meeting-assistant-admin
   - **Description**: Admin service account for calendar operations
4. Download the JSON key file
5. Add service account email to your admin calendar with "Make changes to events" permission

### Step 2: Environment Configuration

```env
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Admin Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=meeting-assistant-admin@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your-project-id

# Admin Calendar Configuration
ADMIN_CALENDAR_ID=admin@yourcompany.com
ADMIN_EMAIL=admin@yourcompany.com
```

### Step 3: OAuth Scopes Required

The application requests the following Google OAuth scopes:

```javascript
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',           // Full calendar access
  'https://www.googleapis.com/auth/calendar.events',   // Calendar events
  'https://www.googleapis.com/auth/gmail.send',        // Send emails
  'https://www.googleapis.com/auth/userinfo.email',    // User email
  'https://www.googleapis.com/auth/userinfo.profile'   // User profile
];
```

---

## 📧 Email Notification System

### Email Templates

The system sends automated emails for:
1. **Meeting Invitations**: When a meeting is created
2. **Meeting Updates**: When meeting details change
3. **Transcript Ready**: When Fireflies completes transcription

### Email Configuration

#### Using Gmail API (Recommended)
```env
# Gmail API Configuration
GMAIL_FROM_EMAIL=noreply@yourcompany.com
GMAIL_FROM_NAME="Meeting Assistant"
```

#### Email Templates Structure
```
src/
├── templates/
│   ├── meeting-invitation.html
│   ├── meeting-update.html
│   └── transcript-ready.html
└── lib/
    └── email-service.ts
```

### Meeting Invitation Email Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>Meeting Invitation: {{meetingTitle}}</title>
</head>
<body>
    <h2>You're invited to: {{meetingTitle}}</h2>
    <p><strong>Date:</strong> {{meetingDate}}</p>
    <p><strong>Time:</strong> {{meetingTime}}</p>
    <p><strong>Duration:</strong> {{duration}}</p>
    
    <div style="margin: 20px 0;">
        <a href="{{meetLink}}" style="background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join Google Meet</a>
    </div>
    
    <p><strong>Meeting Details:</strong></p>
    <ul>
        <li>Meeting ID: {{meetingId}}</li>
        <li>Organizer: {{organizerName}}</li>
        <li>Attendees: {{attendeesList}}</li>
    </ul>
    
    <p><em>This meeting will be automatically transcribed by Fireflies.ai</em></p>
</body>
</html>
```

---

## API Endpoints

### 1. Create Meeting with Google Meet
**Endpoint:** `POST /api/meetings/create-with-meet`

**Purpose:** Creates a new meeting with Google Meet integration, calendar events, and email notifications

**Authentication:** Required (Firebase ID token)

**Request Body:**
```json
{
  "title": "Weekly Team Meeting",
  "description": "Weekly sync meeting for project updates",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "attendees": [
    {"email": "john@example.com", "name": "John Doe"},
    {"email": "jane@example.com", "name": "Jane Smith"}
  ],
  "userGoogleToken": "optional_user_google_access_token",
  "sendInvitations": true,
  "enableTranscription": true,
  "timezone": "America/New_York"
}
```

**Request Parameters:**
- `title` (string, required): Meeting title
- `description` (string, optional): Meeting description
- `startTime` (string, required): ISO 8601 datetime string
- `endTime` (string, optional): ISO 8601 datetime string (defaults to 1 hour after start)
- `attendees` (array, optional): Array of attendee objects with email and name
- `userGoogleToken` (string, optional): User's Google access token for calendar integration
- `sendInvitations` (boolean, optional): Send email invitations (default: true)
- `enableTranscription` (boolean, optional): Add Fireflies for transcription (default: true)
- `timezone` (string, optional): Meeting timezone (default: UTC)

**Response:**
```json
{
  "success": true,
  "meetingId": "firestore_document_id",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "calendarEventId": "google_calendar_event_id",
  "calendarLink": "https://calendar.google.com/event?eid=...",
  "invitationsSent": 2,
  "firefliesAdded": true
}
```

**Calendar Integration Behavior:**
- **With userGoogleToken (User-hosted meeting):**
  1. Creates primary event on user's Google Calendar
  2. User becomes the meeting host
  3. Creates backup event on admin calendar for Fireflies integration
  4. Adds `fred@fireflies.ai` to admin calendar event only
  5. Sends calendar invitations from user's account

- **Without userGoogleToken (Admin-hosted meeting):**
  1. Creates event on admin calendar only
  2. Admin becomes the meeting host
  3. Adds `fred@fireflies.ai` directly to the event
  4. Sends calendar invitations from admin account

**Email Notification Flow:**
1. Creates calendar events with Google Meet link
2. Sends personalized email invitations to all attendees
3. Includes meeting details, Google Meet link, and calendar attachment
4. Adds meeting to attendees' calendars automatically

**Error Responses:**
- `401 Unauthorized`: Missing or invalid Firebase token
- `400 Bad Request`: Missing required fields or invalid data
- `403 Forbidden`: Insufficient Google Calendar permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Meeting creation failed

---

### 2. List User Meetings
**Endpoint:** `GET /api/meetings`

**Purpose:** Retrieves paginated list of user's meetings with filtering options

**Authentication:** Required (Firebase ID token)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `platform` (string, optional): Filter by platform ("zoom", "teams", "google")
- `status` (string, optional): Filter by status ("scheduled", "in-progress", "completed", "cancelled")

**Example Request:**
```
GET /api/meetings?page=1&limit=10&platform=google&status=scheduled
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "meeting_id_1",
        "title": "Weekly Team Meeting",
        "platform": "google",
        "status": "scheduled",
        "createdBy": "firebase_user_id",
        "participants": [
          {"name": "John Doe", "email": "john@example.com"}
        ],
        "transcript": "",
        "summary": "",
        "actionItems": [],
        "decisions": [],
        "meetingUrl": "https://meet.google.com/abc-defg-hij",
        "firefliesId": null,
        "createdAt": "2024-01-15T09:00:00Z",
        "updatedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid Firebase token
- `500 Internal Server Error`: Database query failed

---

### 3. Send Meeting Invitation Email
**Endpoint:** `POST /api/meetings/send-invitation`

**Purpose:** Sends email invitation for an existing meeting

**Authentication:** Required (Firebase ID token)

**Request Body:**
```json
{
  "meetingId": "firestore_meeting_id",
  "recipients": ["new@example.com"],
  "customMessage": "Please join our important meeting"
}
```

**Response:**
```json
{
  "success": true,
  "emailsSent": 1,
  "failedEmails": []
}
```

### 4. Admin Token Setup
**Endpoint:** `POST /api/admin/setup-token`

**Purpose:** Saves admin Google OAuth tokens for calendar integration

**Authentication:** None (internal setup endpoint)

**Request Body:**
```json
{
  "access_token": "google_access_token",
  "refresh_token": "google_refresh_token",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin tokens saved successfully",
  "permissions": {
    "calendar": true,
    "gmail": true
  }
}
```

**Behavior:**
- Stores tokens in Firestore `system/admin_google_token` document
- Validates token permissions for calendar and email access
- Tests calendar and Gmail API connectivity
- Used for admin calendar integration and email notifications

---

### 5. Check Admin Setup Status
**Endpoint:** `GET /api/admin/check-setup`

**Purpose:** Checks if admin Google tokens are configured

**Authentication:** None

**Response:**
```json
{
  "isSetup": true
}
```

**Behavior:**
- Returns `true` if admin tokens exist in database
- Returns `false` if admin setup is required
- Used by frontend to show/hide admin setup UI

---

### 6. Google OAuth Callback
**Endpoint:** `GET /api/auth/google/callback`

**Purpose:** Handles Google OAuth callback and token exchange

**Authentication:** None (OAuth callback)

**Query Parameters:**
- `code` (string): Authorization code from Google
- `state` (string, optional): State parameter ("admin_setup" for admin flow)
- `error` (string, optional): OAuth error

**Behavior:**
- **Regular OAuth:** Redirects to `/?token=access_token`
- **Admin Setup (state=admin_setup):** Saves tokens via `/api/admin/setup-token` and redirects to `/?admin_setup=success`
- **Error Cases:** Redirects to `/?error=error_type`

**Redirect URLs:**
- Success: `http://localhost:3000/?token=<access_token>`
- Admin Setup Success: `http://localhost:3000/?admin_setup=success`
- Error: `http://localhost:3000/?error=<error_type>`

---

### 7. Fireflies Webhook
**Endpoint:** `POST /api/fireflies/meeting-completed`

**Purpose:** Receives webhook notifications when Fireflies completes transcription

**Authentication:** Optional webhook signature validation (currently disabled)

**Request Headers:**
- `x-fireflies-signature` (optional): Webhook signature
- `x-user-id` (optional): Custom user ID

**Request Body:**
```json
{
  "eventType": "Transcription completed",
  "meetingId": "fireflies_meeting_id"
}
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Receives notification when Fireflies completes transcription
- Fetches full transcript from Fireflies GraphQL API
- Saves transcript data to Firestore meetings collection
- Updates meeting record with transcription, summary, and metadata

**Fireflies GraphQL Query:**
```graphql
query GetTranscript($transcriptId: ID!) {
  transcript(id: $transcriptId) {
    id
    title
    sentences {
      text
      speaker { name }
    }
    summary { text }
    meeting_info {
      meeting_url
      duration
    }
  }
}
```

---

## 📊 Database Schema

### Meetings Collection (`meetings`)
```typescript
{
  id: string;                    // Firestore document ID
  title: string;                 // Meeting title
  platform: 'google' | 'zoom' | 'teams';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: string;             // Firebase user ID
  participants: Array<{
    name: string;
    email: string;
  }>;
  transcript: string;            // Full meeting transcript
  summary: string;               // AI-generated summary
  actionItems: string[];         // Extracted action items
  decisions: string[];           // Key decisions made
  meetingUrl: string;            // Google Meet link
  calendarLink?: string;         // Google Calendar event link
  firefliesId?: string;          // Fireflies meeting ID
  createdAt: Date;               // Creation timestamp
  updatedAt?: Date;              // Last update timestamp
  scheduledOnAdminCalendar: boolean; // Admin calendar flag
}
```

### System Collection (`system/admin_google_token`)
```typescript
{
  access_token: string;          // Google access token
  refresh_token: string;         // Google refresh token
  expires_at: number;            // Expiration timestamp (ms)
  admin_email: string;           // Admin email address
  created_at: Date;              // Token creation date
}
```

---

## 🔄 Integration Flows

### Complete Meeting Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant G as Google Calendar
    participant E as Email Service
    participant FF as Fireflies
    participant DB as Firestore

    U->>F: Fill meeting form
    F->>A: POST /api/meetings/create-with-meet
    A->>DB: Validate Firebase token
    
    alt User has Google token
        A->>G: Create event on user calendar
        A->>G: Create backup on admin calendar
        A->>G: Add fred@fireflies.ai to admin event
    else No user token
        A->>G: Create event on admin calendar
        A->>G: Add fred@fireflies.ai to event
    end
    
    A->>DB: Save meeting data
    A->>E: Send invitation emails
    A->>F: Return meeting details
    F->>U: Show success + Meet link
```

### Email Notification Flow

1. **Meeting Creation Email:**
   - Triggered immediately after calendar event creation
   - Sent to all attendees with meeting details
   - Includes Google Meet link and calendar attachment
   - Uses Gmail API with admin credentials

2. **Email Template Processing:**
   ```javascript
   const emailData = {
     meetingTitle: meeting.title,
     meetingDate: formatDate(meeting.startTime),
     meetingTime: formatTime(meeting.startTime, meeting.timezone),
     duration: calculateDuration(meeting.startTime, meeting.endTime),
     meetLink: meeting.meetingUrl,
     organizerName: meeting.createdBy.name,
     attendeesList: meeting.participants.map(p => p.name).join(', ')
   };
   ```

3. **Calendar Attachment:**
   - Generates .ics file for each invitation
   - Includes meeting details and Google Meet link
   - Automatically adds to recipient's calendar

### Google Calendar Integration Details

#### User-Hosted Meeting (with userGoogleToken)
```javascript
// 1. Create primary event on user's calendar
const userEvent = {
  summary: meeting.title,
  description: meeting.description,
  start: { dateTime: meeting.startTime, timeZone: meeting.timezone },
  end: { dateTime: meeting.endTime, timeZone: meeting.timezone },
  attendees: meeting.participants.map(p => ({ email: p.email })),
  conferenceData: {
    createRequest: {
      requestId: generateRequestId(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  },
  sendUpdates: 'all'
};

// 2. Create backup event on admin calendar for Fireflies
const adminEvent = {
  ...userEvent,
  attendees: [{ email: 'fred@fireflies.ai' }],
  summary: `[BACKUP] ${meeting.title}`,
  sendUpdates: 'none'
};
```

#### Admin-Hosted Meeting (no userGoogleToken)
```javascript
const adminEvent = {
  summary: meeting.title,
  description: meeting.description,
  start: { dateTime: meeting.startTime, timeZone: meeting.timezone },
  end: { dateTime: meeting.endTime, timeZone: meeting.timezone },
  attendees: [
    ...meeting.participants.map(p => ({ email: p.email })),
    { email: 'fred@fireflies.ai' }
  ],
  conferenceData: {
    createRequest: {
      requestId: generateRequestId(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  },
  sendUpdates: 'all'
};
```

### Fireflies Transcription Flow

1. **Meeting Setup:**
   - `fred@fireflies.ai` added to calendar event
   - Fireflies bot automatically joins Google Meet
   - Recording and transcription start automatically

2. **Post-Meeting Processing:**
   - Fireflies processes audio after meeting ends
   - Generates transcript, summary, and action items
   - Sends webhook to `/api/fireflies/meeting-completed`

3. **Webhook Processing:**
   ```javascript
   // Fireflies GraphQL query
   const query = `
     query GetTranscript($transcriptId: ID!) {
       transcript(id: $transcriptId) {
         id
         title
         sentences {
           text
           speaker { name }
           start_time
         }
         summary { text }
         action_items { text }
         meeting_info {
           meeting_url
           duration
           participants { name email }
         }
       }
     }
   `;
   ```

4. **Database Update:**
   - Updates Firestore meeting document
   - Adds transcript, summary, action items
   - Sends notification email to meeting creator

### Admin Setup Flow

1. **Initial Setup:**
   ```bash
   # Admin visits setup URL
   https://yourapp.com/admin/setup
   ```

2. **OAuth Flow:**
   ```javascript
   const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
     `client_id=${GOOGLE_CLIENT_ID}&` +
     `redirect_uri=${GOOGLE_REDIRECT_URI}&` +
     `scope=${GOOGLE_SCOPES.join(' ')}&` +
     `response_type=code&` +
     `state=admin_setup&` +
     `access_type=offline&` +
     `prompt=consent`;
   ```

3. **Token Storage:**
   ```javascript
   // Stored in Firestore
   const adminTokenDoc = {
     access_token: tokens.access_token,
     refresh_token: tokens.refresh_token,
     expires_at: Date.now() + (tokens.expires_in * 1000),
     scope: tokens.scope,
     admin_email: 'admin@yourcompany.com',
     created_at: new Date(),
     permissions: {
       calendar: tokens.scope.includes('calendar'),
       gmail: tokens.scope.includes('gmail.send')
     }
   };
   ```

---

## 🔧 Implementation Code Examples

### Google Calendar Service

```typescript
// src/lib/google-calendar.ts
import { google } from 'googleapis';
import { getAdminTokens, refreshAdminTokens } from './firebase-admin';

export class GoogleCalendarService {
  private calendar;
  private gmail;

  constructor(accessToken?: string) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    if (accessToken) {
      auth.setCredentials({ access_token: accessToken });
    }

    this.calendar = google.calendar({ version: 'v3', auth });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async createMeetingWithMeet(meetingData) {
    const event = {
      summary: meetingData.title,
      description: meetingData.description,
      start: {
        dateTime: meetingData.startTime,
        timeZone: meetingData.timezone || 'UTC'
      },
      end: {
        dateTime: meetingData.endTime,
        timeZone: meetingData.timezone || 'UTC'
      },
      attendees: meetingData.attendees.map(a => ({ email: a.email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      sendUpdates: 'all'
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
      calendarLink: response.data.htmlLink
    };
  }

  async sendInvitationEmail(meetingData, recipients) {
    const emailTemplate = await this.generateEmailTemplate(meetingData);
    const calendarAttachment = await this.generateICSFile(meetingData);

    for (const recipient of recipients) {
      const message = {
        to: recipient.email,
        subject: `Meeting Invitation: ${meetingData.title}`,
        html: emailTemplate,
        attachments: [{
          filename: 'meeting.ics',
          content: calendarAttachment,
          contentType: 'text/calendar'
        }]
      };

      await this.sendEmail(message);
    }
  }
}
```

### Email Service Implementation

```typescript
// src/lib/email-service.ts
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export class EmailService {
  private gmail;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async sendMeetingInvitation(meetingData, recipients) {
    const template = await this.loadTemplate('meeting-invitation.html');
    const html = this.processTemplate(template, {
      meetingTitle: meetingData.title,
      meetingDate: new Date(meetingData.startTime).toLocaleDateString(),
      meetingTime: new Date(meetingData.startTime).toLocaleTimeString(),
      meetLink: meetingData.meetingUrl,
      organizerName: meetingData.organizer.name
    });

    const icsContent = this.generateICS(meetingData);

    for (const recipient of recipients) {
      const email = this.createEmail({
        to: recipient.email,
        subject: `Meeting Invitation: ${meetingData.title}`,
        html,
        attachments: [{
          filename: 'meeting.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar'
        }]
      });

      await this.gmail.users.messages.send({
        userId: 'me',
        resource: { raw: email }
      });
    }
  }

  private generateICS(meetingData) {
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Meeting Assistant//EN
BEGIN:VEVENT
UID:${meetingData.id}@meetingassistant.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${new Date(meetingData.startTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(meetingData.endTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${meetingData.title}
DESCRIPTION:Join the meeting: ${meetingData.meetingUrl}
LOCATION:${meetingData.meetingUrl}
END:VEVENT
END:VCALENDAR`;
  }
}
```

---

## 🚫 Troubleshooting

### Common Issues

#### 1. "Insufficient permissions" Error
**Cause:** Missing OAuth scopes or admin setup incomplete

**Solution:**
```bash
# Check admin setup status
curl -X GET https://yourapp.com/api/admin/check-setup

# If not setup, complete admin OAuth flow
https://yourapp.com/admin/setup
```

#### 2. "Calendar event creation failed"
**Cause:** Invalid datetime format or timezone issues

**Solution:**
```javascript
// Ensure proper ISO 8601 format
const startTime = new Date('2024-01-15T10:00:00').toISOString();
const endTime = new Date('2024-01-15T11:00:00').toISOString();

// Include timezone
const event = {
  start: { dateTime: startTime, timeZone: 'America/New_York' },
  end: { dateTime: endTime, timeZone: 'America/New_York' }
};
```

#### 3. "Fireflies bot not joining"
**Cause:** `fred@fireflies.ai` not properly added to calendar event

**Solution:**
```javascript
// Ensure Fireflies is added to attendees
const attendees = [
  ...meetingData.participants.map(p => ({ email: p.email })),
  { email: 'fred@fireflies.ai', responseStatus: 'accepted' }
];
```

#### 4. "Email invitations not sending"
**Cause:** Gmail API not enabled or insufficient permissions

**Solution:**
1. Enable Gmail API in Google Cloud Console
2. Add `https://www.googleapis.com/auth/gmail.send` to OAuth scopes
3. Re-run admin setup to get updated permissions

### Testing Calendar Integration

```bash
# Test admin setup
curl -X GET "https://yourapp.com/api/admin/check-setup"

# Test meeting creation
curl -X POST "https://yourapp.com/api/meetings/create-with-meet" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "attendees": [{"email": "test@example.com", "name": "Test User"}]
  }'
```

### Monitoring and Logs

```javascript
// Add logging to track integration status
console.log('Calendar Integration Status:', {
  adminSetup: await checkAdminSetup(),
  userToken: !!userGoogleToken,
  firefliesEnabled: meetingData.enableTranscription,
  emailNotifications: meetingData.sendInvitations
});
``` for all users

---

## Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Fireflies Configuration
FIREFLIES_WEBHOOK_SECRET=your_webhook_secret
FIREFLIES_API_KEY=your_api_key
```

---

## Error Handling

### Common Error Responses
```json
{
  "error": "Error message",
  "status": 400
}
```

### Error Types
- **Authentication Errors (401):** Invalid or missing Firebase token
- **Validation Errors (400):** Missing required fields or invalid data
- **Server Errors (500):** Database failures, external API failures
- **Token Errors:** Google token expired or invalid

### Retry Logic
- Admin token refresh is automatic when tokens expire
- Failed meeting creation falls back to basic Google Meet links
- Fireflies webhook failures are logged but don't block meeting creation