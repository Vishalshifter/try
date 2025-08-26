import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { APIResponse, PaginatedResponse, Meeting } from '@/types';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query = adminDb.collection('meetings');

    // Filter by user (created by or participant)
    query = query.where('createdBy', '==', decodedToken.uid);

    // Add platform filter
    if (platform) {
      query = query.where('platform', '==', platform);
    }

    // Add status filter
    if (status) {
      query = query.where('status', '==', status);
    }

    // Add search filter (search in title)
    if (search) {
      // Note: Firestore doesn't support full-text search, so we'll filter client-side
      // In production, consider using Algolia or similar for better search
    }

    // Get total count
    const totalSnapshot = await query.count().get();
    const total = totalSnapshot.data().count;

    // Get paginated results
    query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);
    const snapshot = await query.get();

    const meetings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Meeting[];

    // Apply search filter client-side if needed
    let filteredMeetings = meetings;
    if (search) {
      filteredMeetings = meetings.filter(meeting =>
        meeting.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    const totalPages = Math.ceil(total / limit);

    const response: APIResponse<PaginatedResponse<Meeting>> = {
      success: true,
      data: {
        data: filteredMeetings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      message: 'Meetings retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
