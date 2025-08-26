import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { APIResponse, Meeting } from '@/types';

export async function GET(
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

    // Get the meeting
    const meetingRef = adminDb.collection('meetings').doc(meetingId);
    const meetingDoc = await meetingRef.get();

    if (!meetingDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meeting = meetingDoc.data() as Meeting;
    
    // Check if user has access to this meeting
    if (meeting.createdBy !== decodedToken.uid) {
      // Check if user is a participant
      const isParticipant = meeting.participants.some(
        p => p.email === decodedToken.email
      );
      
      if (!isParticipant) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get transcript chunks for detailed view
    const transcriptChunksRef = adminDb
      .collection('transcriptChunks')
      .where('meetingId', '==', meetingId)
      .orderBy('timestamp', 'asc');
    
    const transcriptChunksSnapshot = await transcriptChunksRef.get();
    const transcriptChunks = transcriptChunksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const response: APIResponse<{
      meeting: Meeting;
      transcriptChunks: any[];
    }> = {
      success: true,
      data: {
        meeting: {
          ...meeting,
          id: meetingDoc.id,
        },
        transcriptChunks,
      },
      message: 'Meeting details retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
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

    // Get the meeting to verify access
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

    // Update allowed fields
    const allowedUpdates = {
      title: body.title,
      status: body.status,
      participants: body.participants,
      actionItems: body.actionItems,
      decisions: body.decisions,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });

    await meetingRef.update(allowedUpdates);

    const response: APIResponse = {
      success: true,
      message: 'Meeting updated successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating meeting:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
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

    // Get the meeting to verify access
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

    // Delete transcript chunks
    const transcriptChunksRef = adminDb
      .collection('transcriptChunks')
      .where('meetingId', '==', meetingId);
    
    const transcriptChunksSnapshot = await transcriptChunksRef.get();
    const deletePromises = transcriptChunksSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    // Delete the meeting
    await meetingRef.delete();

    const response: APIResponse = {
      success: true,
      message: 'Meeting deleted successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
