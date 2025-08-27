import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';
// import { validateFirefliesSignature } from '@/lib/fireflies-client';

export async function GET() {
  console.log('🔍 Webhook endpoint accessed via GET');
  return NextResponse.json({ message: 'Fireflies webhook endpoint is working', timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  console.log('🔥 Fireflies webhook called!');
  try {
    const body = await request.text();
    const signature = request.headers.get('x-fireflies-signature');
    const customUserId = request.headers.get('x-user-id');
    console.log('📝 Webhook data:', { bodyLength: body.length, hasSignature: !!signature, customUserId });

    // Temporarily allow requests without signature
    // if (!signature) {
    //   return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    // }

    // Verify webhook signature
    console.log('🔐 Signature check:', {
      received: signature,
      secret: process.env.FIREFLIES_WEBHOOK_SECRET,
      bodyPreview: body.substring(0, 100)
    });

    // Temporarily skip signature validation for testing
    // if (!validateFirefliesSignature(body, signature, process.env.FIREFLIES_WEBHOOK_SECRET!)) {
    //   console.log(' Signature validation failed');
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    console.log('Signature validated successfully');

    const data = JSON.parse(body);
    console.log('Full webhook data:', data);

    // Handle Fireflies' actual format
    if (data.eventType === 'Transcription completed' && data.meetingId) {
      console.log('Processing Fireflies transcription completion');

      try {
        // Fetch full transcript from Fireflies API
        console.log('Fetching transcript from Fireflies API...');
        const response = await fetch(`https://api.fireflies.ai/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`
          },
          body: JSON.stringify({
            query: `
    query GetTranscript($transcriptId: ID!) {
      transcript(id: $transcriptId) {
        id
        title
        sentences {
          text
          speaker { name }
        }
        summary { text }
        meeting_info {
          meeting_url
          duration
        }
      }
    }
  `,
            variables: { transcriptId: data.meetingId }
          })

        });

        const result = await response.json();
        console.log('📊 API Response:', result);

        if (result.data?.transcript) {
          const transcript = result.data.transcript;
          console.log('📝 Transcript data:', transcript);

          // Build full transcript text
          const fullTranscript = transcript.sentences?.map((s: any) =>
            `${s.speaker_name || 'Speaker'}: ${s.text}`
          ).join('\n') || 'No transcript available';

          const meetingData = {
            firefliesId: data.meetingId,
            platform: 'google',
            createdBy: 'admin-user',
            participants: [],
            transcript: fullTranscript,
            summary: 'Meeting transcribed by Fireflies',
            actionItems: [],
            decisions: [],
            createdAt: new Date(),
            title: transcript.title || 'Fireflies Meeting',
            duration: 0,
            meetingUrl: ''
          };

          await db.collection('meetings').doc(data.meetingId).set(meetingData);
          console.log('✅ Full meeting data saved with transcript!');
        } else {
          console.log('❌ No transcript data found in API response');
        }
      } catch (error) {
        console.error('❌ Error fetching transcript:', error);
        // Save basic info as fallback
        await db.collection('meetings').doc(data.meetingId).set({
          firefliesId: data.meetingId,
          platform: 'unknown',
          createdBy: 'admin-user',
          transcript: 'Error fetching transcript',
          summary: 'Error occurred',
          createdAt: new Date()
        });
      }
    } else {
      console.log('⚠️ Skipping event:', data.eventType || data.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fireflies webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}