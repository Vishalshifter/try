# Meeting Assistant Bot

A production-ready AI-powered meeting assistant that integrates with Zoom, Microsoft Teams, and Google Meet to automatically transcribe meetings, generate summaries, extract action items, and provide intelligent insights.

## 🚀 Features

### Core Functionality
- **Multi-Platform Integration**: Support for Zoom, Microsoft Teams, and Google Meet
- **Real-time Audio Processing**: Capture and process meeting audio in real-time
- **AI-Powered Transcription**: Using OpenAI Whisper API for accurate speech-to-text
- **Intelligent Summarization**: GPT-4o powered meeting summaries with action items and key decisions
- **Secure Storage**: Firebase Firestore for encrypted meeting data storage
- **Real-time Updates**: WebSocket-based real-time communication

### Bot Capabilities
- **Automatic Meeting Joining**: Bots can join meetings automatically
- **Audio Recording**: High-quality audio capture with configurable settings
- **Transcription Announcement**: Bots announce when transcription is active
- **Compliance Features**: GDPR/CCPA compliant data handling
- **Error Handling**: Robust error handling and retry mechanisms

### Frontend Features
- **Modern Dashboard**: Beautiful, responsive React-based interface
- **Meeting Management**: Create, view, edit, and delete meetings
- **Search & Filtering**: Advanced search and filtering capabilities
- **Export Options**: PDF and CSV export for meeting notes
- **Real-time Updates**: Live updates via Firestore listeners

## 🏗️ Architecture

### Backend (Next.js API Routes)
- **Serverless Architecture**: Built on Next.js API routes for scalability
- **Firebase Integration**: Authentication, Firestore, and Storage
- **AI Services**: OpenAI integration for transcription and summarization
- **WebSocket Support**: Real-time communication for live updates

### Bot Services
- **Zoom Bot**: Uses Zoom Meeting SDK for integration
- **Teams Bot**: Microsoft Graph Communications API integration
- **Google Meet Bot**: Playwright-based headless browser automation

### Audio Pipeline
- **Real-time Capture**: WebRTC-based audio streaming
- **Format Conversion**: PCM/WAV format support for transcription
- **Chunk Processing**: Configurable audio chunk sizes for optimal performance

## 🛠️ Technology Stack

### Frontend
- **Next.js 15**: React framework with app router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form handling and validation
- **Lucide React**: Beautiful icon library

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Firebase Admin**: Server-side Firebase services
- **OpenAI API**: GPT-4o and Whisper integration
- **WebSocket**: Real-time communication

### Bot Services
- **Playwright**: Browser automation for Google Meet
- **Node.js**: Runtime for bot services
- **Audio Libraries**: PCM processing and format conversion

### Database
- **Firebase Firestore**: NoSQL document database
- **Firebase Auth**: Authentication and user management
- **Firebase Storage**: File storage for recordings

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Firestore enabled
- OpenAI API key
- Platform-specific API credentials (Zoom, Teams, Google)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd mom-notes
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your credentials:

```bash
cp env.example .env.local
```

Required environment variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION=your_org_id

# Platform-specific credentials...
```

### 3. Firebase Setup

1. Create a new Firebase project
2. Enable Authentication, Firestore, and Storage
3. Download service account key for admin SDK
4. Configure Firestore security rules
5. Set up authentication providers (Google, Microsoft)

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🤖 Bot Usage

### Starting Bots

Each platform has its own bot service:

```bash
# Zoom Bot
npm run bot:zoom <meeting-id>

# Teams Bot
npm run bot:teams <meeting-id>

# Google Meet Bot
npm run bot:google <meeting-id>
```

### Bot Configuration

Bots can be configured via environment variables or configuration files:

- Audio quality settings
- Transcription preferences
- Platform-specific credentials
- Compliance settings

## 📱 API Endpoints

### Meeting Management
- `POST /api/meetings/start` - Start a new meeting
- `GET /api/meetings` - List meetings with pagination
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Transcription & Notes
- `POST /api/meetings/:id/transcript` - Save transcript chunk
- `POST /api/meetings/:id/notes` - Generate AI summary

### Authentication
- All endpoints require Firebase ID token in Authorization header
- User access control based on meeting ownership/participation

## 🔒 Security & Compliance

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Control**: Role-based access control for meetings
- **Audit Logging**: Comprehensive logging for compliance
- **Data Retention**: Configurable data retention policies

### Privacy Features
- **GDPR Compliance**: Right to be forgotten, data portability
- **CCPA Compliance**: California consumer privacy protection
- **Transparency**: Clear data usage notifications
- **Consent Management**: User consent for data processing

## 🚀 Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy
```

### Environment Variables

Set production environment variables in your hosting platform:
- Firebase Functions environment
- Vercel environment variables
- Netlify environment variables

### Bot Deployment

Bots can be deployed as:
- Docker containers
- Kubernetes pods
- Serverless functions
- Standalone services

## 📊 Monitoring & Analytics

### Logging
- **Structured Logging**: JSON-formatted logs for easy parsing
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response times and resource usage

### Health Checks
- **Bot Status**: Real-time bot health monitoring
- **API Health**: Endpoint availability and performance
- **Database Health**: Firestore connection and performance

## 🔧 Configuration

### Audio Settings
```typescript
const audioConfig = {
  sampleRate: 16000,    // Hz
  channels: 1,          // Mono
  bitDepth: 16,         // Bits per sample
  format: 'pcm',        // Audio format
  chunkSize: 1000       // Chunk size in ms
};
```

### AI Settings
```typescript
const aiConfig = {
  model: 'gpt-4o',      // OpenAI model
  temperature: 0.3,      // Creativity level
  maxTokens: 2000,      // Response length
  includeActionItems: true,
  includeDecisions: true
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: support@example.com

## 🔮 Roadmap

### Upcoming Features
- **Speaker Identification**: AI-powered speaker recognition
- **Sentiment Analysis**: Meeting mood and tone analysis
- **Integration APIs**: Webhook support for external systems
- **Mobile Apps**: iOS and Android applications
- **Advanced Analytics**: Meeting insights and trends

### Platform Expansion
- **Webex**: Cisco Webex integration
- **Slack**: Slack Huddle support
- **Discord**: Discord voice channel integration
- **Custom Platforms**: Plugin architecture for custom integrations

---

Built with ❤️ by the Meeting Assistant Team
