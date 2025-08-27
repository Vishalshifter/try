# Meeting Assistant Bot

AI-powered meeting assistant that integrates with Google Meet and Fireflies.ai for automatic transcription and meeting management.

## 🚀 Features

- **Google Meet Integration**: Automatic meeting creation with calendar scheduling
- **Fireflies.ai Transcription**: Real-time meeting transcription and processing
- **Firebase Backend**: Secure user authentication and data storage
- **Real-time Dashboard**: View and manage all your meetings

## 🏗️ Architecture

### Frontend Components

#### `src/components/Dashboard.tsx`
- Main dashboard displaying meetings list
- Statistics overview (total meetings, completed, etc.)
- Search and filter functionality
- Pagination for large meeting lists

#### `src/components/CreateMeeting.tsx`
- Meeting creation form with Google Calendar integration
- Google OAuth connection for calendar access
- Automatic Google Meet link generation
- Attendee management

#### `src/components/MeetingCard.tsx`
- Individual meeting display component
- Shows transcript, summary, and meeting details
- Delete meeting functionality
- Meeting status indicators

#### `src/components/Login.tsx`
- Firebase authentication interface
- Google sign-in integration

### Backend API Routes

#### `/api/auth/google/callback`
**Purpose**: Handle Google OAuth callback for calendar integration
**Method**: GET
**Flow**:
1. Receives OAuth code from Google
2. Exchanges code for access token
3. Redirects user back to app with token

#### `/api/meetings/create-with-meet`
**Purpose**: Create new meeting with Google Meet integration
**Method**: POST
**Authentication**: Firebase ID token required
**Body**:
```json
{
  "title": "Meeting Title",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T11:00:00Z",
  "attendees": ["email1@example.com", "email2@example.com"],
  "googleAccessToken": "google_oauth_token"
}
```
**Flow**:
1. Validates Firebase authentication
2. Creates Google Calendar event with Meet link
3. Saves meeting to Firestore database
4. Returns meeting details and Meet link

#### `/api/meetings`
**Purpose**: List user's meetings with pagination
**Method**: GET
**Authentication**: Firebase ID token required
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `platform`: Filter by platform (zoom, teams, google)
- `status`: Filter by status (scheduled, completed, etc.)

#### `/api/fireflies/meeting-completed`
**Purpose**: Webhook endpoint for Fireflies transcription completion
**Method**: POST
**Authentication**: Webhook signature validation (optional)
**Body**:
```json
{
  "meetingId": "fireflies_meeting_id",
  "eventType": "Transcription completed"
}
```
**Flow**:
1. Receives webhook from Fireflies when transcription is ready
2. Fetches full transcript via Fireflies GraphQL API
3. Processes and saves transcript to database
4. Updates meeting record with transcription data

### Core Libraries

#### `src/lib/firebase-admin.ts`
- Server-side Firebase configuration
- Admin SDK initialization
- Database and authentication services

#### `src/lib/firebase.ts`
- Client-side Firebase configuration
- User authentication setup

#### `src/lib/google-calendar.ts`
- Google Calendar API integration
- Meeting creation with Google Meet links
- OAuth token management

#### `src/lib/google-auth.ts`
- Google OAuth helper functions
- Token storage and retrieval
- Authentication URL generation

### Context & Types

#### `src/context/AuthContext.tsx`
- Firebase authentication context
- User state management
- Authentication helpers

#### `src/types/index.ts`
- TypeScript type definitions
- Meeting, User, and API response types

## 🔧 Configuration

### Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Fireflies.ai Configuration
FIREFLIES_WEBHOOK_SECRET=your_webhook_secret
FIREFLIES_API_KEY=your_api_key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## 🚀 Setup & Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd mom-notes
npm install
```

### 2. Firebase Setup
1. Create Firebase project
2. Enable Authentication, Firestore, Storage
3. Download service account key
4. Configure environment variables

### 3. Google OAuth Setup
1. Create Google Cloud project
2. Enable Calendar API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/auth/google/callback`

### 4. Fireflies.ai Setup
1. Create Fireflies account
2. Get API key from dashboard
3. Configure webhook URL: `your-domain/api/fireflies/meeting-completed`

### 5. Run Development Server
```bash
npm run dev
```

## 📱 Usage Flow

### Creating a Meeting
1. User signs in with Firebase
2. Optionally connects Google Calendar
3. Fills meeting form (title, time, attendees)
4. System creates Google Meet link and calendar event
5. Meeting saved to database

### Automatic Transcription
1. Add `fred@fireflies.ai` to meeting attendees
2. Start Google Meet
3. Fireflies bot joins automatically
4. After meeting ends, Fireflies processes transcript
5. Webhook triggers, transcript saved to database
6. Meeting appears in dashboard with full transcript

### Meeting Management
1. View all meetings in dashboard
2. Search and filter meetings
3. View transcript and meeting details
4. Delete meetings if needed

## 🔒 Security

- **Firebase Authentication**: Secure user management
- **API Authorization**: All endpoints require valid Firebase tokens
- **Webhook Validation**: Fireflies webhook signature verification
- **Data Encryption**: All data encrypted in transit and at rest

## 📊 Database Schema

### Meetings Collection
```typescript
{
  id: string;
  title: string;
  platform: 'google' | 'zoom' | 'teams';
  status: 'scheduled' | 'in-progress' | 'completed';
  createdBy: string; // Firebase UID
  participants: Array<{name: string, email: string}>;
  transcript: string;
  summary: string;
  actionItems: string[];
  decisions: string[];
  meetingUrl: string;
  firefliesId?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.