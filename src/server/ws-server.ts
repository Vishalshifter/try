import { WebSocketServer, WebSocket } from 'ws';
import { TranscriptionService } from '@/lib/transcription-service';
import axios from 'axios';

type IncomingMessage = {
  type: 'audio' | 'ping';
  meetingId: string;
  timestamp?: string;
  data?: {
    audio: ArrayBuffer;
    format: 'pcm' | 'wav';
    sampleRate: number;
    channels: number;
  };
};

const PORT = Number(process.env.WS_PORT || 3000);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const wss = new WebSocketServer({ port: PORT });
const transcription = new TranscriptionService();

console.log(`[ws] WebSocket server listening on ws://localhost:${PORT}`);

wss.on('connection', (socket: WebSocket, req) => {
  const url = req.url || '';
  // Expected path: /bot/:platform/:meetingId
  const parts = url.split('/').filter(Boolean);
  const platform = parts[1] || 'unknown';
  const meetingId = parts[2] || '';
  console.log(`[ws] connection from platform=${platform} meetingId=${meetingId}`);

  socket.on('message', async (raw: WebSocket.RawData) => {
    try {
      // Support JSON only for now
      const msg: IncomingMessage = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        return;
      }

      if (msg.type === 'audio' && msg.data && meetingId) {
        const audioBuf = Buffer.from(msg.data.audio as any);
        // Transcribe chunk (simple sequential for now). In prod, batch or queue.
        const result = await transcription.transcribeAudio(
          audioBuf.buffer.slice(audioBuf.byteOffset, audioBuf.byteOffset + audioBuf.byteLength),
          { language: 'en', responseFormat: 'verbose_json' }
        );

        // Forward transcript chunk to API
        await axios.post(
          `${API_BASE}/api/meetings/${meetingId}/transcript`,
          {
            transcript: result.text,
            confidence: result.confidence,
            language: result.language,
            segments: result.segments,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Echo interim transcript to client
        socket.send(
          JSON.stringify({ type: 'transcript', data: { text: result.text, confidence: result.confidence } })
        );
      }
    } catch (err) {
      console.error('[ws] error handling message', err);
      try {
        socket.send(JSON.stringify({ type: 'error', error: 'invalid_message_or_processing_failed' }));
      } catch {}
    }
  });

  socket.on('close', () => {
    console.log(`[ws] connection closed meetingId=${meetingId}`);
  });
});


