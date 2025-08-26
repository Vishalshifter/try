# System Test Instructions

## What's Currently Working

### 1. Start the Application
```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start WebSocket server
npm run ws
```

### 2. Test Meeting Creation
1. Go to http://localhost:3000
2. Sign in with Google/Firebase Auth
3. Create a new meeting
4. Check if email invitation is sent
5. Verify meeting is saved in Firestore

### 3. Test Transcript API
```bash
curl -X POST http://localhost:3000/api/meetings/YOUR_MEETING_ID/transcript \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: test-token" \
  -d '{
    "transcript": "Hello, this is a test transcript",
    "confidence": 0.95,
    "language": "en"
  }'
```

## What's NOT Working Yet

### Zoom Bot Integration
- **Issue**: Needs real Zoom SDK credentials
- **Solution**: Get credentials from Zoom Marketplace
- **Test**: Run `npm run bot:zoom MEETING_ID` after getting credentials

### Audio Processing
- **Issue**: Browser audio capture needs user permission
- **Solution**: Test in browser with microphone access
- **Test**: Check WebSocket audio streaming

## Next Steps to Make Zoom Bot Work

1. **Get Zoom Credentials**
   - Create Zoom Marketplace account
   - Create Meeting SDK app
   - Update .env.local with real values

2. **Test Zoom Integration**
   ```bash
   npm run bot:zoom 123456789
   ```

3. **Test Audio Pipeline**
   - Start WebSocket server
   - Test browser audio capture
   - Verify transcription works

## Production Readiness Checklist

✅ Firebase setup
✅ Next.js API routes
✅ Email service
✅ WebSocket server
✅ Transcription service
❌ Real Zoom integration
❌ Audio capture testing
❌ Error handling improvements
❌ Production deployment