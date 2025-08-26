import { BotConfig, BotStatus, Meeting, WebSocketMessage } from '@/types';
import { NodeAudioProcessor } from '@/lib/audio-processor';
import { TranscriptionService } from '@/lib/transcription-service';
import { chromium, Browser, Page } from 'playwright';
import axios from 'axios';
import { WebSocket } from 'ws';

export class GoogleMeetBot {
  private config: BotConfig;
  private status: BotStatus;
  private audioProcessor: NodeAudioProcessor;
  private transcriptionService: TranscriptionService;
  private currentMeeting: Meeting | null = null;
  private ws: WebSocket | null = null;
  private audioChunks: ArrayBuffer[] = [];
  private isConnected = false;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: BotConfig) {
    this.config = config;
    this.status = {
      platform: 'google',
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

  async joinMeeting(meetingId: string): Promise<void> {
    try {
      this.status.status = 'connecting';
      this.status.lastActivity = new Date();

      console.log(`Joining Google Meet: ${meetingId}`);

      // Launch headless browser
      await this.launchBrowser();

      // Navigate to Google Meet
      await this.navigateToMeet(meetingId);

      // Join the meeting
      await this.joinMeetMeeting();

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

      console.log('Successfully joined Google Meet');
    } catch (error) {
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to join Google Meet:', error);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      console.log('Leaving Google Meet');

      // Stop audio recording
      this.audioProcessor.stopRecording();

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // Leave the meeting
      await this.leaveMeetMeeting();

      // Close browser
      await this.closeBrowser();

      this.status.status = 'idle';
      this.status.currentMeeting = undefined;
      this.isConnected = false;

      console.log('Successfully left Google Meet');
    } catch (error) {
      console.error('Error leaving Google Meet:', error);
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

      // Start Google Meet recording
      await this.startMeetRecording();

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

      // Stop Google Meet recording
      await this.stopMeetRecording();

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

  private async launchBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: false, // Set to true in production
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-running-insecure-content',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      this.page = await this.browser.newPage();
      
      // Set up audio permissions
      await this.page.context().grantPermissions(['microphone']);
      
      console.log('Browser launched successfully');
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }

  private async navigateToMeet(meetingId: string): Promise<void> {
    try {
      if (!this.page) throw new Error('Browser page not initialized');

      const meetUrl = `https://meet.google.com/${meetingId}`;
      await this.page.goto(meetUrl, { waitUntil: 'networkidle' });
      
      console.log('Navigated to Google Meet');
    } catch (error) {
      console.error('Failed to navigate to Google Meet:', error);
      throw error;
    }
  }

  private async joinMeetMeeting(): Promise<void> {
    try {
      if (!this.page) throw new Error('Browser page not initialized');

      // Wait for the join button and click it
      const joinButton = await this.page.waitForSelector('[data-mdc-dialog-action="join"]', { timeout: 30000 });
      if (joinButton) {
        await joinButton.click();
        console.log('Clicked join button');
      }

      // Wait for the meeting to load
      await this.page.waitForSelector('[data-meeting-title]', { timeout: 60000 });
      
      console.log('Successfully joined the meeting');
    } catch (error) {
      console.error('Failed to join meeting:', error);
      throw error;
    }
  }

  private async connectWebSocket(meetingId: string): Promise<void> {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/bot/google/${meetingId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected for Google Meet bot');
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
    try {
      if (!this.page) throw new Error('Browser page not initialized');

      // Inject script to capture audio
      await this.page.evaluate(() => {
        // This would capture audio from the meeting
        console.log('Audio capture script injected');
      });

      console.log('Started audio capture from Google Meet');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      throw error;
    }
  }

  private async announceTranscription(): Promise<void> {
    try {
      if (!this.page) throw new Error('Browser page not initialized');

      // Send a chat message announcing transcription
      const chatButton = await this.page.$('[data-mdc-dialog-action="chat"]');
      if (chatButton) {
        await chatButton.click();
        
        const chatInput = await this.page.waitForSelector('[data-mdc-dialog-action="chat-input"]');
        if (chatInput) {
          const announcement = "Hello, I'm the meeting assistant. This meeting is being transcribed for note-taking purposes.";
          await chatInput.fill(announcement);
          await chatInput.press('Enter');
        }
      }

      console.log('Transcription announcement sent');
    } catch (error) {
      console.error('Failed to send transcription announcement:', error);
    }
  }

  private async leaveMeetMeeting(): Promise<void> {
    try {
      if (!this.page) return;

      // Click the leave call button
      const leaveButton = await this.page.$('[data-mdc-dialog-action="leave-call"]');
      if (leaveButton) {
        await leaveButton.click();
        console.log('Left the meeting');
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }

  private async startMeetRecording(): Promise<void> {
    try {
      if (!this.page) return;

      // Click the record button
      const recordButton = await this.page.$('[data-mdc-dialog-action="record"]');
      if (recordButton) {
        await recordButton.click();
        console.log('Started Google Meet recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  private async stopMeetRecording(): Promise<void> {
    try {
      if (!this.page) return;

      // Click the stop record button
      const stopRecordButton = await this.page.$('[data-mdc-dialog-action="stop-record"]');
      if (stopRecordButton) {
        await stopRecordButton.click();
        console.log('Stopped Google Meet recording');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  private async closeBrowser(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
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
    platform: 'google',
    enabled: true,
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      accessToken: process.env.GOOGLE_ACCESS_TOKEN || '',
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

  const bot = new GoogleMeetBot(config);

  process.on('SIGINT', async () => {
    console.log('Shutting down Google Meet bot...');
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
    console.log('Usage: npm run bot:google <meeting-id>');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
