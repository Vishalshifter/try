import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { fireflies } from '@/lib/fireflies';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingDoc = await db.collection('meetings').doc(params.id).get();
    
    if (!meetingDoc.exists) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const meeting = meetingDoc.data();
    
    const inviteData = {
      title: meeting?.title || 'Meeting',
      start_time: meeting?.startTime,
      end_time: meeting?.endTime,
      meeting_url: meeting?.meetingUrl,
      attendees: meeting?.attendees || [],
      timezone: 'UTC'
    };

    const result = await fireflies.inviteToMeeting(inviteData);
    
    // Update meeting with Fireflies invite ID
    await db.collection('meetings').doc(params.id).update({
      firefliesInviteId: result.data.createMeetingInvite.id,
      firefliesStatus: result.data.createMeetingInvite.status,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, inviteId: result.data.createMeetingInvite.id });
  } catch (error) {
    console.error('Fireflies invite error:', error);
    return NextResponse.json({ error: 'Failed to invite Fireflies' }, { status: 500 });
  }
}