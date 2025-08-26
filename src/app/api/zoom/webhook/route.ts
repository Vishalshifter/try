import { NextRequest, NextResponse } from 'next/server';
import { ZoomServerBot } from '@/bots/zoom/server-bot';

// Store active bots
const activeBots = new Map<string, ZoomServerBot>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify Zoom webhook token
    const authHeader = request.headers.get('authorization');
    if (authHeader !== process.env.ZOOM_VERIFICATION_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔔 Zoom webhook received:', body.event);

    // Handle meeting started event
    if (body.event === 'meeting.started') {
      const meetingId = body.payload.object.id;
      const meetingTopic = body.payload.object.topic;
      
      console.log(`🚀 Meeting started: "${meetingTopic}" (ID: ${meetingId})`);
      console.log('🤖 Auto-launching transcription bot...');
      
      // Start bot in background
      setImmediate(async () => {
        try {
          const bot = new ZoomServerBot(meetingId);
          activeBots.set(meetingId, bot);
          await bot.start();
        } catch (error) {
          console.error('❌ Bot failed to join meeting:', error);
          activeBots.delete(meetingId);
        }
      });
    }

    // Handle meeting ended event
    if (body.event === 'meeting.ended') {
      const meetingId = body.payload.object.id;
      console.log(`🏁 Meeting ended: ${meetingId}`);
      
      // Stop the bot if it's active
      const bot = activeBots.get(meetingId);
      if (bot) {
        try {
          await bot.stop();
          activeBots.delete(meetingId);
          console.log('🤖 Bot stopped for ended meeting');
        } catch (error) {
          console.error('Error stopping bot:', error);
        }
      }
    }

    // Handle recording completed event
    if (body.event === 'recording.completed') {
      const meetingId = body.payload.object.id;
      console.log(`📹 Recording completed for meeting: ${meetingId}`);
      
      // Process final transcription
      const bot = activeBots.get(meetingId);
      if (bot) {
        // Final processing will be handled by the bot
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}