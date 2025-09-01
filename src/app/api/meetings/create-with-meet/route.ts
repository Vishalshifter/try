import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb as db } from '@/lib/firebase-admin';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { AdminTokenManager } from '@/lib/admin-token-manager';

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const { title, startTime, endTime, attendees, userGoogleToken } = await request.json();

    if (!title || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let meetLink = `https://meet.google.com/new`;
    let calendarLink = '';
    
    // Create meeting and get the Google Meet link
    let sharedMeetLink = '';
    
    if (userGoogleToken) {
      // User connected - create on user's calendar first
      try {
        console.log('Creating meeting on user calendar...');
        const userCalendarService = new GoogleCalendarService(userGoogleToken);
        const userResult = await userCalendarService.createMeetingWithGoogleMeet({
          title,
          startTime,
          endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          attendees: attendees || []
        });
        meetLink = userResult.meetLink;
        sharedMeetLink = userResult.meetLink;
        calendarLink = userResult.htmlLink;
        console.log('User calendar meeting created:', userResult);
      } catch (error) {
        console.error('User calendar creation failed:', error);
      }
    } else {
      // User not connected - create on admin calendar
      try {
        console.log('Creating meeting on admin calendar...');
        const adminToken = await AdminTokenManager.getValidToken();
        const adminCalendarService = new GoogleCalendarService(adminToken);
        const adminResult = await adminCalendarService.createMeetingWithGoogleMeet({
          title,
          startTime,
          endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          attendees: attendees || []
        });
        meetLink = adminResult.meetLink;
        sharedMeetLink = adminResult.meetLink;
        calendarLink = adminResult.htmlLink;
        console.log('Admin calendar meeting created:', adminResult);
      } catch (error) {
        console.error('Admin calendar creation failed:', error);
        meetLink = `https://meet.google.com/new`;
      }
    }
    
    // Always create backup on admin calendar for Fireflies (using same meet link)
    if (userGoogleToken && sharedMeetLink) {
      try {
        console.log('Creating Fireflies backup on admin calendar...');
        const adminToken = await AdminTokenManager.getValidToken();
        const adminCalendarService = new GoogleCalendarService(adminToken);
        await adminCalendarService.createMeetingWithExistingLink({
          title: `[Fireflies] ${title}`,
          startTime,
          endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          attendees: ['fred@fireflies.ai', ...(attendees || [])],
          meetLink: sharedMeetLink
        });
        console.log('Fireflies backup created with same meet link');
      } catch (error) {
        console.error('Fireflies backup creation failed:', error);
      }
    }

    // Save to Firestore
    const meetingData = {
      title,
      startTime,
      endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
      attendees: attendees || [],
      meetingUrl: meetLink,
      calendarLink,
      platform: 'google',
      createdBy: decodedToken.uid,
      status: 'scheduled',
      createdAt: new Date(),
      scheduledOnAdminCalendar: true
    };

    const docRef = await db.collection('meetings').add(meetingData);

    return NextResponse.json({
      success: true,
      meetingId: docRef.id,
      meetLink
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}