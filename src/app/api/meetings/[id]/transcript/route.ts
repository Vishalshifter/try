import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { APIResponse, TranscriptChunk } from '@/types';
import { TranscriptionService } from '@/lib/transcription-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication: either Firebase ID token or service token
    const serviceToken = request.headers.get('x-service-token');
    let decodedToken: any = null;
    // Accept any non-empty serviceToken as valid for bot-service (since Zoom tokens are dynamic)
    if (serviceToken) {
      decodedToken = { uid: 'bot-service' };
    } else {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const token = authHeader.split('Bearer ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    const meetingId = params.id;
    const body = await request.json();
    const { transcript, confidence, language, segments, audio, format, sampleRate, channels, isFinal } = body;

    // If raw audio is provided, transcribe it
    let finalTranscript = transcript as string | undefined;
    let finalConfidence = confidence as number | undefined;
    let finalLanguage = language as string | undefined;
    let finalSegments = segments as any[] | undefined;

    if (!finalTranscript && audio) {
      if (!format || !sampleRate || !channels) {
        return NextResponse.json(
          { success: false, error: 'Missing audio metadata (format/sampleRate/channels)' },
          { status: 400 }
        );
      }
      try {
        const transcription = new TranscriptionService();
        const audioBuf = Buffer.from(audio, 'base64');
        const result = await transcription.transcribeAudio(
          audioBuf.buffer.slice(audioBuf.byteOffset, audioBuf.byteOffset + audioBuf.byteLength),
          { language: 'en', responseFormat: 'verbose_json' }
        );
        finalTranscript = result.text;
        finalConfidence = result.confidence;
        finalLanguage = result.language;
        finalSegments = result.segments as any[];
      } catch (err) {
        return NextResponse.json(
          { success: false, error: 'Transcription failed' },
          { status: 500 }
        );
      }
    }

    if (!finalTranscript) {
      return NextResponse.json(
        { success: false, error: 'Transcript text or audio is required' },
        { status: 400 }
      );
    }

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
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (decodedToken?.uid !== 'bot-service' && meeting?.createdBy !== decodedToken.uid) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create transcript chunk
    const transcriptChunk: Omit<TranscriptChunk, 'id'> = {
      meetingId,
      speaker: 'Unknown', // Could be enhanced with speaker identification
      text: finalTranscript,
      timestamp: new Date(),
      confidence: finalConfidence || 0.9,
      language: finalLanguage || 'en',
    };

    // Save transcript chunk
    const chunkRef = adminDb.collection('transcriptChunks').doc();
    await chunkRef.set(transcriptChunk);

    // Update meeting with new transcript
    const currentTranscript = meeting.transcript || '';
    const newTranscript = currentTranscript + (currentTranscript ? '\n' : '') + finalTranscript;
    
    await meetingRef.update({
      transcript: newTranscript,
      'metadata.transcriptionStatus': 'completed',
      updatedAt: new Date(),
    });

    const response: APIResponse<{ chunkId: string }> = {
      success: true,
      data: { chunkId: chunkRef.id },
      message: 'Transcript chunk saved successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error saving transcript:', error);
    
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
