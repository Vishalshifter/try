# Admin Calendar Setup

This setup ensures all meetings created by any user get scheduled on the admin calendar (vishal@shitfertech.com).

## Setup Steps

### 1. Install googleapis package
```bash
npm install googleapis
```

### 2. Get Admin Google Access Token
```bash
node scripts/setup-admin-token.js
```

### 3. Add to .env file
```env
# Add this line to your .env file
ADMIN_GOOGLE_ACCESS_TOKEN=your_admin_access_token_here
```

### 4. How it works
- Users create meetings through the app
- All meetings get scheduled on vishal@shitfertech.com's calendar
- Users don't need to connect their own Google accounts
- Admin can manage all meetings from one calendar

### 5. Token Refresh (Optional)
For production, implement token refresh using the refresh token:

```javascript
// In google-calendar.ts
static async refreshAdminToken() {
  const refreshToken = process.env.ADMIN_GOOGLE_REFRESH_TOKEN;
  // Implement refresh logic
}
```

## Changes Made

1. **Modified API** (`/api/meetings/create-with-meet`):
   - Removed user Google token requirement
   - Uses admin credentials for all calendar operations

2. **Updated GoogleCalendarService**:
   - Added `createAdminService()` method
   - Uses admin token from environment variables

3. **Simplified CreateMeeting Component**:
   - Removed Google OAuth flow for users
   - Shows admin calendar notification

4. **Database Changes**:
   - Added `scheduledOnAdminCalendar: true` flag
   - Added `calendarLink` field for admin calendar events