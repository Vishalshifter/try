# Meeting Assistant Bot - Technical Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Component Deep Dive](#component-deep-dive)
3. [API Endpoints Detailed](#api-endpoints-detailed)
4. [Database Design](#database-design)
5. [Authentication Flow](#authentication-flow)
6. [Integration Details](#integration-details)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Security Implementation](#security-implementation)
10. [Deployment Guide](#deployment-guide)

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   External      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ - Dashboard     │    │ - Auth Routes   │    │ - Firebase      │
│ - CreateMeeting │    │ - Meeting API   │    │ - Google Cal    │
│ - MeetingCard   │    │ - Webhooks      │    │ - Fireflies     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
```
User Creates Meeting → Google Calendar API → Firebase Database
                                          ↓
Fireflies Bot Joins ← Google Meet Link ←─┘
                                          ↓
Meeting Transcription → Fireflies API → Webhook → Database Update
```

## 🔍 Component Deep Dive

### Dashboard Component (`src/components/Dashboard.tsx`)

**Purpose**: Main application interface for meeting management

**Key Features**:
- **Meeting List Display**: Renders paginated list of user meetings
- **Real-time Statistics**: Shows meeting counts, completion rates
- **Search & Filter**: Client-side filtering by title, platform, status
- **Responsive Design**: Mobile-first approach with Tailwind CSS

**State Management**:
```typescript
const [meetings, setMeetings] = useState<Meeting[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [platformFilter, setPlatformFilter] = useState<string>('');
const [statusFilter, setStatusFilter] = useState<string>('');
const [pagination, setPagination] = useState({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});
```

**API Integration**:
- Fetches meetings via `/api/meetings` with pagination
- Implements Firebase ID token authentication
- Handles loading states and error scenarios

**Performance Optimizations**:
- Debounced search to prevent excessive API calls
- Pagination to limit data transfer
- Memoized filter functions

### CreateMeeting Component (`src/components/CreateMeeting.tsx`)

**Purpose**: Meeting creation interface with Google Calendar integration

**Key Features**:
- **Form Validation**: Client-side validation for required fields
- **Google OAuth Integration**: Optional calendar access for enhanced features
- **Real-time Feedback**: Loading states and success/error messages
- **Attendee Management**: Email parsing and validation

**OAuth Flow**:
```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    storeAccessToken(tokenFromUrl);
    setGoogleToken(tokenFromUrl);
    window.history.replaceState({}, '', window.location.pathname);
  } else {
    const storedToken = getStoredAccessToken();
    setGoogleToken(storedToken);
  }
}, []);
```

**Form Submission Process**:
1. Validate form inputs
2. Get Firebase authentication token
3. Call `/api/meetings/create-with-meet` endpoint
4. Handle response and update UI
5. Reset form on success

### MeetingCard Component (`src/components/MeetingCard.tsx`)

**Purpose**: Individual meeting display with management actions

**Key Features**:
- **Meeting Details Display**: Title, date, participants, platform
- **Transcript Preview**: Truncated transcript with full view option
- **Status Indicators**: Visual status badges with color coding
- **Action Menu**: Delete functionality with confirmation

**Delete Functionality**:
```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this meeting?')) {
    return;
  }

  try {
    setLoading(true);
    const token = await (window as any).firebase?.auth?.currentUser?.getIdToken();
    
    const response = await fetch(`/api/meetings/${meeting.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete meeting');
    }

    toast.success('Meeting deleted successfully');
    onRefresh();
  } catch (error) {
    toast.error('Failed to delete meeting');
  } finally {
    setLoading(false);
    setShowActions(false);
  }
};
```

## 🔌 API Endpoints Detailed

### `/api/auth/google/callback` (GET)

**Purpose**: Handle Google OAuth 2.0 callback for calendar integration

**Request Flow**:
1. User redirected from Google OAuth consent screen
2. Extract authorization code from query parameters
3. Exchange code for access token via Google OAuth API
4. Redirect user back to application with token

**Implementation Details**:
```typescript
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: 'http://localhost:3000/api/auth/google/callback',
  }),
});
```

**Error Handling**:
- Invalid authorization code
- Network failures
- Token exchange errors
- Redirect URI mismatches

### `/api/meetings/create-with-meet` (POST)

**Purpose**: Create meeting with Google Calendar integration

**Authentication**: Firebase ID token required in Authorization header

**Request Body Schema**:
```typescript
{
  title: string;           // Meeting title (required)
  startTime: string;       // ISO 8601 datetime (required)
  endTime?: string;        // ISO 8601 datetime (optional, defaults to +1 hour)
  attendees?: string[];    // Array of email addresses
  googleAccessToken?: string; // Google OAuth token for calendar integration
}
```

**Processing Steps**:
1. **Authentication Verification**:
   ```typescript
   const token = authHeader.split('Bearer ')[1];
   const decodedToken = await adminAuth.verifyIdToken(token);
   ```

2. **Google Calendar Integration** (if token provided):
   ```typescript
   const calendarService = new GoogleCalendarService(googleAccessToken);
   const result = await calendarService.createMeetingWithGoogleMeet({
     title,
     startTime,
     endTime,
     attendees
   });
   ```

3. **Database Storage**:
   ```typescript
   const meetingData = {
     title,
     startTime,
     endTime,
     attendees: attendees || [],
     meetingUrl: meetLink,
     platform: 'google',
     createdBy: decodedToken.uid,
     status: 'scheduled',
     createdAt: new Date()
   };
   
   const docRef = await db.collection('meetings').add(meetingData);
   ```

**Response Format**:
```typescript
{
  success: boolean;
  meetingId: string;
  meetLink: string;
  calendarLink?: string;
}
```

### `/api/meetings` (GET)

**Purpose**: Retrieve paginated list of user meetings

**Authentication**: Firebase ID token required

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `platform`: Filter by platform ('google', 'zoom', 'teams')
- `status`: Filter by status ('scheduled', 'completed', 'cancelled')

**Database Query**:
```typescript
let query = db.collection('meetings')
  .where('createdBy', '==', decodedToken.uid)
  .orderBy('createdAt', 'desc');

if (platform) {
  query = query.where('platform', '==', platform);
}

if (status) {
  query = query.where('status', '==', status);
}

const snapshot = await query
  .limit(limit)
  .offset((page - 1) * limit)
  .get();
```

**Response Format**:
```typescript
{
  success: boolean;
  data: {
    data: Meeting[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### `/api/fireflies/meeting-completed` (POST)

**Purpose**: Webhook endpoint for Fireflies transcription completion

**Webhook Payload**:
```json
{
  "meetingId": "01K3N89VFJ4CRRDR0TZZ5QDWKM",
  "eventType": "Transcription completed"
}
```

**Processing Flow**:
1. **Webhook Validation** (optional):
   ```typescript
   const signature = request.headers.get('x-fireflies-signature');
   // Validate signature against webhook secret
   ```

2. **Fireflies API Integration**:
   ```typescript
   const response = await fetch('https://api.fireflies.ai/graphql', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`
     },
     body: JSON.stringify({
       query: `
         query GetTranscript($transcriptId: String!) {
           transcript(id: $transcriptId) {
             id
             title
             sentences {
               text
               speaker_id
             }
           }
         }
       `,
       variables: { transcriptId: data.meetingId }
     })
   });
   ```

3. **Transcript Processing**:
   ```typescript
   const fullTranscript = transcript.sentences?.map((s: any) =>
     `Speaker ${s.speaker_id || 'Unknown'}: ${s.text}`
   ).join('\n') || 'No transcript available';
   ```

4. **Database Update**:
   ```typescript
   const meetingData = {
     firefliesId: data.meetingId,
     platform: 'google',
     createdBy: 'admin-user',
     participants: [],
     transcript: fullTranscript,
     summary: 'Meeting transcribed by Fireflies',
     actionItems: [],
     decisions: [],
     createdAt: new Date(),
     title: transcript.title || 'Fireflies Meeting'
   };
   
   await db.collection('meetings').doc(data.meetingId).set(meetingData);
   ```

## 🗄️ Database Design

### Firebase Firestore Structure

#### Meetings Collection (`/meetings/{meetingId}`)
```typescript
interface Meeting {
  id: string;                    // Document ID
  title: string;                 // Meeting title
  platform: 'google' | 'zoom' | 'teams'; // Meeting platform
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: string;             // Firebase UID of creator
  participants: Array<{          // Meeting participants
    name: string;
    email: string;
  }>;
  transcript: string;            // Full meeting transcript
  summary: string;               // AI-generated summary
  actionItems: string[];         // Extracted action items
  decisions: string[];           // Meeting decisions
  meetingUrl: string;            // Google Meet/Zoom/Teams URL
  calendarEventId?: string;      // Google Calendar event ID
  calendarLink?: string;         // Google Calendar event link
  firefliesId?: string;          // Fireflies meeting ID
  startTime?: string;            // Scheduled start time (ISO 8601)
  endTime?: string;              // Scheduled end time (ISO 8601)
  duration?: number;             // Actual duration in minutes
  createdAt: Date;               // Creation timestamp
  updatedAt?: Date;              // Last update timestamp
}
```

#### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /meetings/{meetingId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy;
    }
  }
}
```

#### Indexes
```javascript
// Composite indexes for efficient querying
{
  "collectionGroup": "meetings",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "createdBy", "order": "ASCENDING"},
    {"fieldPath": "createdAt", "order": "DESCENDING"}
  ]
},
{
  "collectionGroup": "meetings",
  "queryScope": "COLLECTION", 
  "fields": [
    {"fieldPath": "createdBy", "order": "ASCENDING"},
    {"fieldPath": "platform", "order": "ASCENDING"},
    {"fieldPath": "createdAt", "order": "DESCENDING"}
  ]
}
```

## 🔐 Authentication Flow

### Firebase Authentication Setup

#### Client-Side Configuration (`src/lib/firebase.ts`)
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### Server-Side Configuration (`src/lib/firebase-admin.ts`)
```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

### Authentication Context (`src/context/AuthContext.tsx`)
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe; 
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Token Verification Middleware
```typescript
export async function verifyAuthToken(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
```

## 🔗 Integration Details

### Google Calendar API Integration

#### Service Class (`src/lib/google-calendar.ts`)
```typescript
export class GoogleCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Calendar API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    
    return {
      eventId: result.id,
      meetLink: result.conferenceData?.entryPoints?.[0]?.uri || result.hangoutLink || '',
      htmlLink: result.htmlLink
    };
  }
}
```

#### OAuth Helper Functions (`src/lib/google-auth.ts`)
```typescript
export const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: 'http://localhost:3000/api/auth/google/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const getStoredAccessToken = () => {
  return localStorage.getItem('google_access_token');
};

export const storeAccessToken = (token: string) => {
  localStorage.setItem('google_access_token', token);
};
```

### Fireflies.ai Integration

#### GraphQL API Client
```typescript
const FIREFLIES_GRAPHQL_ENDPOINT = 'https://api.fireflies.ai/graphql';

export async function fetchFirefliesTranscript(meetingId: string): Promise<any> {
  const response = await fetch(FIREFLIES_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({
      query: `
        query GetTranscript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            sentences {
              text
              speaker_id
            }
          }
        }
      `,
      variables: { transcriptId: meetingId }
    })
  });

  if (!response.ok) {
    throw new Error(`Fireflies API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}
```

#### Webhook Signature Validation
```typescript
import crypto from 'crypto';

export function validateFirefliesSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## ⚠️ Error Handling

### Global Error Handling Strategy

#### API Error Response Format
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

#### Client-Side Error Handling
```typescript
// Toast notifications for user feedback
import { toast } from 'react-hot-toast';

const handleApiError = (error: any, defaultMessage: string) => {
  const message = error?.response?.data?.error || error?.message || defaultMessage;
  toast.error(message);
  console.error('API Error:', error);
};

// Usage in components
try {
  const response = await fetch('/api/meetings');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  // Handle success
} catch (error) {
  handleApiError(error, 'Failed to fetch meetings');
}
```

#### Server-Side Error Handling
```typescript
export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await handler();
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Specific Error Scenarios

#### Firebase Authentication Errors
```typescript
const handleAuthError = (error: any) => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No user found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    default:
      return 'Authentication failed. Please try again';
  }
};
```

#### Google Calendar API Errors
```typescript
const handleCalendarError = (error: any) => {
  if (error.status === 401) {
    return 'Google Calendar access expired. Please reconnect your account';
  }
  if (error.status === 403) {
    return 'Insufficient permissions for Google Calendar';
  }
  if (error.status === 429) {
    return 'Rate limit exceeded. Please try again later';
  }
  return 'Failed to create calendar event';
};
```

## 🚀 Performance Considerations

### Frontend Optimizations

#### React Performance
```typescript
// Memoized components to prevent unnecessary re-renders
const MeetingCard = React.memo(({ meeting, onRefresh }: MeetingCardProps) => {
  // Component implementation
});

// Debounced search to reduce API calls
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

#### Lazy Loading
```typescript
// Code splitting for better initial load times
const Dashboard = lazy(() => import('@/components/Dashboard'));
const CreateMeeting = lazy(() => import('@/components/CreateMeeting'));

// Image lazy loading
<img 
  src={meeting.thumbnail} 
  loading="lazy" 
  alt="Meeting thumbnail"
/>
```

### Backend Optimizations

#### Database Query Optimization
```typescript
// Efficient pagination with cursor-based approach
export async function getPaginatedMeetings(
  userId: string,
  limit: number,
  lastDoc?: any
) {
  let query = db.collection('meetings')
    .where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  
  return {
    meetings: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === limit
  };
}
```

#### Caching Strategy
```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedMeetings(userId: string) {
  const cacheKey = `meetings:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const meetings = await fetchMeetingsFromDB(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(meetings)); // 5 min cache
  
  return meetings;
}
```

## 🔒 Security Implementation

### Input Validation
```typescript
import Joi from 'joi';

const createMeetingSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  startTime: Joi.string().isoDate().required(),
  endTime: Joi.string().isoDate().optional(),
  attendees: Joi.array().items(Joi.string().email()).max(50).optional(),
  googleAccessToken: Joi.string().optional()
});

export function validateCreateMeetingRequest(data: any) {
  const { error, value } = createMeetingSchema.validate(data);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
}
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const createMeetingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 meeting creations per windowMs
  message: 'Too many meetings created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to meeting creation endpoint
export async function POST(request: NextRequest) {
  await createMeetingLimiter(request);
  // ... rest of the handler
}
```

### Data Sanitization
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// Usage in API handlers
const sanitizedTitle = sanitizeInput(body.title);
```

## 🚀 Deployment Guide

### Environment Setup

#### Production Environment Variables
```env
# Firebase Production Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=prod_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prod-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prod-project-id

# Firebase Admin Production
FIREBASE_ADMIN_PROJECT_ID=prod-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@prod-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google OAuth Production
NEXT_PUBLIC_GOOGLE_CLIENT_ID=prod_google_client_id
GOOGLE_CLIENT_ID=prod_google_client_id
GOOGLE_CLIENT_SECRET=prod_google_client_secret

# Fireflies Production
FIREFLIES_WEBHOOK_SECRET=prod_webhook_secret
FIREFLIES_API_KEY=prod_api_key

# Additional Production Settings
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Vercel Deployment
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Monitoring and Logging

#### Application Monitoring
```typescript
// src/lib/monitoring.ts
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

export function trackMeetingCreated(meetingId: string) {
  logEvent(getAnalytics(), 'meeting_created', {
    meeting_id: meetingId,
    timestamp: new Date().toISOString()
  });
}

export function trackTranscriptionCompleted(meetingId: string, duration: number) {
  logEvent(getAnalytics(), 'transcription_completed', {
    meeting_id: meetingId,
    duration_seconds: duration
  });
}
```

#### Error Tracking
```typescript
// src/lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export function captureError(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context
  });
}
```

### Health Checks
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connectivity
    await adminDb.collection('health').doc('check').get();
    
    // Check external services
    const firefliesHealth = await checkFirefliesHealth();
    const googleHealth = await checkGoogleCalendarHealth();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        fireflies: firefliesHealth ? 'healthy' : 'degraded',
        google_calendar: googleHealth ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message
      },
      { status: 503 }
    );
  }
}
```

This technical documentation provides comprehensive details about every aspect of the Meeting Assistant Bot system, from architecture and implementation details to deployment and monitoring strategies.