import { BotConfig, BotStatus, Meeting, WebSocketMessage } from '@/types';
import { NodeAudioProcessor } from '@/lib/audio-processor';
import { TranscriptionService } from '@/lib/transcription-service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { WebSocket } from 'ws';
import { getZoomAccessToken } from '@/lib/zoom-token';

export class ZoomBot {
  private config: BotConfig;
  private status: BotStatus;
  private audioProcessor: NodeAudioProcessor;
  private transcriptionService: TranscriptionService;
  private currentMeeting: Meeting | null = null;
  private ws: WebSocket | null = null;
  private audioChunks: ArrayBuffer[] = [];
  private isConnected = false;

  constructor(config: BotConfig) {
    this.config = config;
    this.status = {
      platform: 'zoom',
      status: 'idle',
      lastActivity: new Date(),
    };

    this.audioProcessor = new NodeAudioProcessor({
      sampleRate: config.settings.sampleRate,
      channels: config.settings.channels,
      bitDepth: 16,
      format: 'pcm',
      chunkSize: 1000, // 1 second chunks
    });

    this.transcriptionService = new TranscriptionService();
  }

  async joinMeeting(meetingId: string, password?: string): Promise<void> {
    try {
      this.status.status = 'connecting';
      this.status.lastActivity = new Date();

      console.log(`Joining Zoom meeting: ${meetingId}`);

      // Initialize Zoom Meeting SDK (this would require the actual SDK)
      await this.initializeZoomSDK(meetingId, password);

      // Connect to WebSocket for real-time communication
      await this.connectWebSocket(meetingId);

      // Start audio recording
      await this.startAudioRecording();

      // Announce transcription if enabled
      if (this.config.settings.announceTranscription) {
        await this.announceTranscription();
      }

      this.status.status = 'connected';
      this.status.currentMeeting = meetingId;
      this.isConnected = true;

      console.log('Successfully joined Zoom meeting');
    } catch (error) {
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to join Zoom meeting:', error);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      console.log('Leaving Zoom meeting');

      // Stop audio recording
      this.audioProcessor.stopRecording();

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // Leave the meeting (Zoom SDK call)
      await this.leaveZoomMeeting();

      this.status.status = 'idle';
      this.status.currentMeeting = undefined;
      this.isConnected = false;

      console.log('Successfully left Zoom meeting');
    } catch (error) {
      console.error('Error leaving Zoom meeting:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Bot is not connected to a meeting');
      }

      this.status.status = 'recording';
      console.log('Starting meeting recording');

      // Start Zoom recording
      await this.startZoomRecording();

      // Start audio processing and POST chunks over HTTPS (no WebSocket)
      await this.audioProcessor.startRecording();
      // @ts-ignore
      this.audioProcessor.on('data', async (chunk: unknown) => {
        try {
          let buf: Buffer;
          if (Buffer.isBuffer(chunk)) {
            buf = chunk;
          } else if (chunk instanceof ArrayBuffer || chunk instanceof SharedArrayBuffer) {
            buf = Buffer.from(new Uint8Array(chunk));
          } else if (chunk instanceof Uint8Array) {
            buf = Buffer.from(chunk);
          } else {
            throw new Error('Unsupported audio chunk type');
          }
          const base64 = buf.toString('base64');
          const accessToken = await getZoomAccessToken();
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/meetings/${this.status.currentMeeting}/transcript`,
            {
              audio: base64,
              format: 'pcm',
              sampleRate: this.config.settings.sampleRate,
              channels: this.config.settings.channels,
              isFinal: false,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Service-Token': accessToken,
              },
              timeout: 10000,
            }
          );
        } catch (e) {
          console.warn('Chunk upload failed:', (e as Error).message);
        }
      });

      console.log('Meeting recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    try {
      console.log('Stopping meeting recording');

      // Stop Zoom recording
      await this.stopZoomRecording();

      // Stop audio processing
      this.audioProcessor.stopRecording();

      // Process final audio chunks
      await this.processFinalAudio();

      this.status.status = 'connected';
      console.log('Meeting recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  private async initializeZoomSDK(meetingId: string, password?: string): Promise<void> {
    console.log('Joining Zoom meeting via REST API...');
    
    try {
      const accessToken = await getZoomAccessToken();
      
      // Get meeting info
      const meetingInfo = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Meeting info retrieved:', meetingInfo.data.topic);
      
      // For server-side bot, we simulate joining by registering as a participant
      // In production, you'd use Zoom's Meeting Bot framework or WebRTC
      console.log('Bot registered for meeting:', meetingId);
      
    } catch (error) {
      console.error('Failed to join meeting:', error);
      throw error;
    }
  }
  
  private async generateZoomSignature(meetingNumber: string): Promise<string> {
    try {
      const response = await axios.post('/api/zoom/signature', {
        meetingNumber,
        role: 0 // 0 = attendee, 1 = host
      });
      
      return response.data.signature;
    } catch (error) {
      console.error('Failed to generate Zoom signature:', error);
      throw error;
    }
  }

  private async connectWebSocket(meetingId: string): Promise<void> {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/bot/zoom/${meetingId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected for Zoom bot');
    };

    this.ws.onmessage = async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        await this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  private async handleWebSocketMessage(message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'transcript':
        await this.handleTranscriptMessage(message);
        break;
      case 'status':
        await this.handleStatusMessage(message);
        break;
      case 'error':
        await this.handleErrorMessage(message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async handleTranscriptMessage(message: WebSocketMessage): Promise<void> {
    // Handle incoming transcript updates
    console.log('Received transcript update:', message.data);
  }

  private async handleStatusMessage(message: WebSocketMessage): Promise<void> {
    // Handle status updates
    console.log('Received status update:', message.data);
  }

  private async handleErrorMessage(message: WebSocketMessage): Promise<void> {
    // Handle error messages
    console.error('Received error message:', message.data);
  }

  private async startAudioRecording(): Promise<void> {
    // Start capturing audio from the Zoom meeting
    // This would involve accessing the meeting's audio stream
    console.log('Starting audio capture from Zoom meeting');
  }

  private async announceTranscription(): Promise<void> {
    // Announce that the meeting is being transcribed
    const announcement = "Hello, I'm the meeting assistant. This meeting is being transcribed for note-taking purposes.";
    console.log('Announcing transcription:', announcement);
    
    // In a real implementation, you would send this as a chat message
    // or use text-to-speech to announce it
  }

  private async leaveZoomMeeting(): Promise<void> {
    // Leave the Zoom meeting using the SDK
    console.log('Leaving Zoom meeting via SDK');
  }

  private async startZoomRecording(): Promise<void> {
    // Start Zoom's built-in recording
    console.log('Starting Zoom recording');
  }

  private async stopZoomRecording(): Promise<void> {
    // Stop Zoom's built-in recording
    console.log('Stopping Zoom recording');
  }

  private async processFinalAudio(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        console.log('No audio chunks to process');
        return;
      }

      console.log(`Processing ${this.audioChunks.length} audio chunks`);

      // Combine all audio chunks
      const combinedAudio = this.combineAudioChunks(this.audioChunks);

      // Transcribe the combined audio
      const transcription = await this.transcriptionService.transcribeAudio(combinedAudio);

      // Send transcription to backend
      await this.sendTranscriptionToBackend(transcription);

      // Clear audio chunks
      this.audioChunks = [];

      console.log('Final audio processing completed');
    } catch (error) {
      console.error('Error processing final audio:', error);
    }
  }

  private combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return combined.buffer;
  }

  private async sendTranscriptionToBackend(transcription: any): Promise<void> {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/meetings/${this.currentMeeting?.id}/transcript`,
        {
          transcript: transcription.text,
          confidence: transcription.confidence,
          language: transcription.language,
          segments: transcription.segments,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.credentials.accessToken}`,
          },
        }
      );

      console.log('Transcription sent to backend:', response.data);
    } catch (error) {
      console.error('Failed to send transcription to backend:', error);
    }
  }

  getStatus(): BotStatus {
    return { ...this.status };
  }

  getConfig(): BotConfig {
    return { ...this.config };
  }

  isConnectedToMeeting(): boolean {
    return this.isConnected;
  }
}

// CLI interface for running the bot
async function main() {
  const config: BotConfig = {
    platform: 'zoom',
    enabled: true,
    credentials: {
      accountId: process.env.ZOOM_ACCOUNT_ID || '',
      clientId: process.env.ZOOM_CLIENT_ID || '',
      clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
      // Removed old keys: apiKey, apiSecret, sdkKey, sdkSecret, accessToken
    },
    settings: {
      autoJoin: true,
      announceTranscription: true,
      recordAudio: true,
      language: 'en',
      sampleRate: 16000,
      channels: 1,
    },
  };

  const bot = new ZoomBot(config);

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('Shutting down Zoom bot...');
    if (bot.isConnectedToMeeting()) {
      await bot.leaveMeeting();
    }
    process.exit(0);
  });

  // Example usage
  const meetingId = process.argv[2];
  if (meetingId) {
    try {
      await bot.joinMeeting(meetingId);
      await bot.startRecording();
      
      // Keep the bot running
      setInterval(() => {
        console.log('Bot status:', bot.getStatus());
      }, 30000); // Log status every 30 seconds
      
    } catch (error) {
      console.error('Bot failed:', error);
      process.exit(1);
    }
  } else {
    console.log('Usage: npm run bot:zoom <meeting-id>');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
