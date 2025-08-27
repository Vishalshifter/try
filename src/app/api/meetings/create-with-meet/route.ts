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
    
    const { title, startTime, endTime, attendees } = await request.json();

    if (!title || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let meetLink = `https://meet.google.com/new`;
    let calendarLink = '';
    
    // Create on admin calendar and get the real Google Meet link
    try {
      console.log('Getting admin token...');
      const adminToken = await AdminTokenManager.getValidToken();
      console.log('Admin token obtained, creating calendar service...');
      const calendarService = new GoogleCalendarService(adminToken);
      console.log('Creating meeting with Google Meet...');
      const result = await calendarService.createMeetingWithGoogleMeet({
        title: `[Auto] ${title}`,
        startTime,
        endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
        attendees: ['fred@fireflies.ai', ...(attendees || [])]
      });
      console.log('Meeting created successfully:', result);
      meetLink = result.meetLink; // Use the real Google Meet link
      calendarLink = result.htmlLink;
    } catch (error) {
      console.error('Admin calendar creation failed:', error);
      meetLink = `https://meet.google.com/new`;
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