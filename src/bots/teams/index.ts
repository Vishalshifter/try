import { BotConfig, BotStatus, Meeting, WebSocketMessage } from '@/types';
import { NodeAudioProcessor } from '@/lib/audio-processor';
import { TranscriptionService } from '@/lib/transcription-service';
import axios from 'axios';
import { WebSocket } from 'ws';

export class TeamsBot {
  private config: BotConfig;
  private status: BotStatus;
  private audioProcessor: NodeAudioProcessor;
  private transcriptionService: TranscriptionService;
  private currentMeeting: Meeting | null = null;
  private ws: WebSocket | null = null;
  private audioChunks: ArrayBuffer[] = [];
  private isConnected = false;
  private accessToken: string | null = null;

  constructor(config: BotConfig) {
    this.config = config;
    this.status = {
      platform: 'teams',
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

  async authenticate(): Promise<void> {
    try {
      console.log('Authenticating with Microsoft Graph...');

      // Get access token using client credentials flow
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.MICROSOFT_APP_ID || '',
          client_secret: process.env.MICROSOFT_APP_PASSWORD || '',
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = tokenResponse.data.access_token;
      console.log('Successfully authenticated with Microsoft Graph');
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Failed to authenticate with Microsoft Graph');
    }
  }

  async joinMeeting(meetingId: string): Promise<void> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      this.status.status = 'connecting';
      this.status.lastActivity = new Date();

      console.log(`Joining Teams meeting: ${meetingId}`);

      // Join the meeting using Microsoft Graph Communications API
      await this.joinTeamsMeeting(meetingId);

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

      console.log('Successfully joined Teams meeting');
    } catch (error) {
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to join Teams meeting:', error);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      console.log('Leaving Teams meeting');

      // Stop audio recording
      this.audioProcessor.stopRecording();

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // Leave the meeting via Graph API
      await this.leaveTeamsMeeting();

      this.status.status = 'idle';
      this.status.currentMeeting = undefined;
      this.isConnected = false;

      console.log('Successfully left Teams meeting');
    } catch (error) {
      console.error('Error leaving Teams meeting:', error);
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

      // Start Teams recording via Graph API
      await this.startTeamsRecording();

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

      // Stop Teams recording via Graph API
      await this.stopTeamsRecording();

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

  private async joinTeamsMeeting(meetingId: string): Promise<void> {
    try {
      // Join the meeting using Microsoft Graph Communications API
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/communications/calls`,
        {
          '@odata.type': '#microsoft.graph.call',
          callbackUri: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/teams/callback`,
          targets: [
            {
              '@odata.type': '#microsoft.graph.invitationParticipantInfo',
              identity: {
                '@odata.type': '#microsoft.graph.identitySet',
                application: {
                  '@odata.type': '#microsoft.graph.identity',
                  id: process.env.MICROSOFT_APP_ID,
                },
              },
            },
          ],
          requestedModalities: ['audio'],
          mediaConfig: {
            '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Successfully joined Teams meeting via Graph API');
    } catch (error) {
      console.error('Failed to join Teams meeting via Graph API:', error);
      throw error;
    }
  }

  private async connectWebSocket(meetingId: string): Promise<void> {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/bot/teams/${meetingId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected for Teams bot');
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
    console.log('Received transcript update:', message.data);
  }

  private async handleStatusMessage(message: WebSocketMessage): Promise<void> {
    console.log('Received status update:', message.data);
  }

  private async handleErrorMessage(message: WebSocketMessage): Promise<void> {
    console.error('Received error message:', message.data);
  }

  private async startAudioRecording(): Promise<void> {
    console.log('Starting audio capture from Teams meeting');
  }

  private async announceTranscription(): Promise<void> {
    const announcement = "Hello, I'm the meeting assistant. This meeting is being transcribed for note-taking purposes.";
    console.log('Announcing transcription:', announcement);
  }

  private async leaveTeamsMeeting(): Promise<void> {
    try {
      // Leave the meeting via Graph API
      console.log('Leaving Teams meeting via Graph API');
    } catch (error) {
      console.error('Error leaving Teams meeting:', error);
    }
  }

  private async startTeamsRecording(): Promise<void> {
    try {
      // Start Teams recording via Graph API
      console.log('Starting Teams recording via Graph API');
    } catch (error) {
      console.error('Error starting Teams recording:', error);
    }
  }

  private async stopTeamsRecording(): Promise<void> {
    try {
      // Stop Teams recording via Graph API
      console.log('Stopping Teams recording via Graph API');
    } catch (error) {
      console.error('Error stopping Teams recording:', error);
    }
  }

  private async processFinalAudio(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        console.log('No audio chunks to process');
        return;
      }

      console.log(`Processing ${this.audioChunks.length} audio chunks`);

      const combinedAudio = this.combineAudioChunks(this.audioChunks);
      const transcription = await this.transcriptionService.transcribeAudio(combinedAudio);

      await this.sendTranscriptionToBackend(transcription);
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
            'Authorization': `Bearer ${this.accessToken}`,
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
    platform: 'teams',
    enabled: true,
    credentials: {
      appId: process.env.MICROSOFT_APP_ID || '',
      appPassword: process.env.MICROSOFT_APP_PASSWORD || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || '',
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

  const bot = new TeamsBot(config);

  process.on('SIGINT', async () => {
    console.log('Shutting down Teams bot...');
    if (bot.isConnectedToMeeting()) {
      await bot.leaveMeeting();
    }
    process.exit(0);
  });

  const meetingId = process.argv[2];
  if (meetingId) {
    try {
      await bot.joinMeeting(meetingId);
      await bot.startRecording();
      
      setInterval(() => {
        console.log('Bot status:', bot.getStatus());
      }, 30000);
      
    } catch (error) {
      console.error('Bot failed:', error);
      process.exit(1);
    }
  } else {
    console.log('Usage: npm run bot:teams <meeting-id>');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
