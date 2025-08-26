import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { SummarizationService } from '@/lib/summarization-service';
import { APIResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const meetingId = params.id;
    const body = await request.json();
    const {
      includeActionItems = true,
      includeDecisions = true,
      includeKeyTopics = true,
      includeSentiment = true,
      customPrompt,
    } = body;

    // Get the meeting to verify access and get transcript
    const meetingRef = adminDb.collection('meetings').doc(meetingId);
    const meetingDoc = await meetingRef.get();

    if (!meetingDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meeting = meetingDoc.data();
    if (meeting?.createdBy !== decodedToken.uid) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if transcript exists
    if (!meeting.transcript || meeting.transcript.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'No transcript available for this meeting' },
        { status: 400 }
      );
    }

    // Initialize summarization service
    const summarizationService = new SummarizationService();

    // Generate meeting summary
    const summaryResult = await summarizationService.generateMeetingSummary(
      meeting.transcript,
      meeting,
      {
        includeActionItems,
        includeDecisions,
        includeKeyTopics,
        includeSentiment,
        customPrompt,
      }
    );

    // Update meeting with AI-generated notes
    await meetingRef.update({
      summary: summaryResult.summary,
      actionItems: summaryResult.actionItems,
      decisions: summaryResult.decisions,
      'metadata.summaryStatus': 'completed',
      updatedAt: new Date(),
    });

    const response: APIResponse<typeof summaryResult> = {
      success: true,
      data: summaryResult,
      message: 'AI notes generated successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error generating AI notes:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
