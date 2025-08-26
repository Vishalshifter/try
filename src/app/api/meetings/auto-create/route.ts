import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { meetingId, title, platform = 'zoom', startTime, hostEmail } = await request.json();

    // Create meeting in database
    const meetingData = {
      id: meetingId,
      title: title || `Meeting ${meetingId}`,
      platform,
      status: 'active',
      transcript: '',
      createdBy: 'auto-system',
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: startTime ? new Date(startTime) : new Date(),
      hostEmail: hostEmail || 'unknown@example.com',
      metadata: {
        transcriptionStatus: 'in-progress',
        autoJoined: true,
        botActive: true
      }
    };

    await adminDb.collection('meetings').doc(meetingId).set(meetingData);

    console.log(`📝 Meeting created in database: ${meetingId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Meeting created successfully',
      meetingId 
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}