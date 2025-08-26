import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Meeting, Participant, APIResponse } from '@/types';
import { EmailService } from '@/lib/email-service';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  console.log('[MEETING_START] Starting meeting creation process');
  
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[MEETING_START] Authentication failed: No valid authorization header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      console.log('[MEETING_START] Verifying authentication token');
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('[MEETING_START] Authentication successful for user:', decodedToken.uid);
    } catch (error) {
      console.error('[MEETING_START] Authentication failed:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[MEETING_START] Request body received:', {
      platform: body.platform,
      meetingId: body.meetingId,
      title: body.title,
      participantsCount: body.participants ? body.participants.length : 0,
      scheduledAt: body.scheduledAt
    });

    const {
      platform,
      meetingId,
      title,
      participants,
      scheduledAt,
    } = body;

    // Validate required fields
    if (!platform || !meetingId || !title) {
      console.error('[MEETING_START] Missing required fields:', {
        platform: !!platform,
        meetingId: !!meetingId,
        title: !!title
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create meeting object
    const meeting: Omit<Meeting, 'id'> = {
      platform,
      meetingId,
      title,
      createdBy: decodedToken.uid,
      participants: participants || [],
      transcript: '',
      actionItems: [],
      decisions: [],
      status: 'scheduled',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        transcriptionStatus: 'pending',
        summaryStatus: 'pending',
      },
    };

    console.log('[MEETING_START] Creating meeting object:', {
      title: meeting.title,
      platform: meeting.platform,
      participantsCount: meeting.participants.length,
      scheduledAt: meeting.scheduledAt
    });

    // Add to Firestore
    const meetingRef = adminDb.collection('meetings').doc();
    console.log('[MEETING_START] Saving meeting to Firestore with ID:', meetingRef.id);
    
    await meetingRef.set(meeting);
    console.log('[MEETING_START] Meeting saved successfully to Firestore');

    // Try to send invites to participants (non-blocking, but awaited here once)
    try {
      if (Array.isArray(meeting.participants) && meeting.participants.length > 0) {
        const validParticipants = meeting.participants
          .filter((p: Participant) => !!p.email);
        
        console.log('[MEETING_START] Sending email invites to participants:', {
          totalParticipants: meeting.participants.length,
          validParticipants: validParticipants.length,
          participantEmails: validParticipants.map((p: Participant) => p.email)
        });

        if (validParticipants.length > 0) {
          const emailer = new EmailService();
          const emailResults = await Promise.allSettled(
            validParticipants.map((p: Participant) =>
              emailer.sendMeetingInvite({
                to: p.email!,
                meetingTitle: meeting.title,
                platform: meeting.platform,
                externalMeetingId: meeting.meetingId,
                meetingDocId: meetingRef.id,
                scheduledAt: meeting.scheduledAt,
              })
            )
          );

          // Log email sending results
          const successfulEmails = emailResults.filter(result => result.status === 'fulfilled');
          const failedEmails = emailResults.filter(result => result.status === 'rejected');
          
          console.log('[MEETING_START] Email sending results:', {
            total: emailResults.length,
            successful: successfulEmails.length,
            failed: failedEmails.length
          });

          if (failedEmails.length > 0) {
            console.error('[MEETING_START] Failed email sends:', failedEmails.map((result: any) => ({
              email: result.reason?.email || 'unknown',
              error: result.reason?.message || result.reason
            })));
          }
        } else {
          console.log('[MEETING_START] No valid email addresses found for participants');
        }
      } else {
        console.log('[MEETING_START] No participants to send emails to');
      }
    } catch (e) {
      console.error('[MEETING_START] Critical error in email sending process:', e);
      // Don't fail the entire meeting creation if email fails
    }

    console.log('[MEETING_START] Meeting creation completed successfully');
    const response: APIResponse<{ meetingId: string }> = {
      success: true,
      data: { meetingId: meetingRef.id },
      message: 'Meeting started successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[MEETING_START] Error starting meeting:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
