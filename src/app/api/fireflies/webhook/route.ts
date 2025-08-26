import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-fireflies-signature');
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.FIREFLIES_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    
    if (signature !== `sha256=${expectedSignature}`) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    
    if (data.event === 'transcript.completed') {
      const { transcript } = data;
      
      // Save transcript to Firestore
      await db.collection('meetings').doc(transcript.id).update({
        transcriptId: transcript.id,
        transcript: transcript.sentences,
        summary: transcript.summary,
        actionItems: transcript.action_items,
        keywords: transcript.keywords,
        duration: transcript.duration,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fireflies webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}