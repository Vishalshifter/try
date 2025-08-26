import { AudioConfig, WebSocketMessage } from '@/types';
import { EventEmitter } from 'events';
import record from 'node-record-lpcm16';

export class AudioProcessor {
  private config: AudioConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private ws: WebSocket | null = null;

  constructor(config: AudioConfig) {
    this.config = config;
  }

  async startRecording(meetingId: string, wsUrl: string): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.ws = new WebSocket(wsUrl);
      this.setupWebSocket(meetingId);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.processAudioChunk(event.data, meetingId);
        }
      };

      this.mediaRecorder.start(this.config.chunkSize);
      this.isRecording = true;

      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private setupWebSocket(meetingId: string): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  private async processAudioChunk(audioBlob: Blob, meetingId: string): Promise<void> {
    try {
      // Convert audio to the desired format
      const audioBuffer = await this.convertBlobToAudioBuffer(audioBlob);
      const processedAudio = await this.convertAudioFormat(audioBuffer);
      
      // Send audio chunk via WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: 'audio',
          data: {
            audio: processedAudio,
            format: this.config.format,
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
          },
          timestamp: new Date(),
          meetingId,
        };
        
        this.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  private async convertBlobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  private async convertAudioFormat(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
    // Convert to PCM format for better compatibility with transcription services
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    
    const pcmData = new Float32Array(length * numberOfChannels);
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let sample = 0; sample < length; sample++) {
        pcmData[sample * numberOfChannels + channel] = channelData[sample];
      }
    }

    // Convert to 16-bit PCM
    const pcm16 = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return pcm16.buffer;
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  getAudioConfig(): AudioConfig {
    return this.config;
  }
}

interface NodeAudioProcessorEvents {
  data: (chunk: ArrayBuffer) => void;
  error: (err: unknown) => void;
}

// Node.js version for bot services
export class NodeAudioProcessor extends EventEmitter {
  private config: AudioConfig;
  private isRecording = false;
  private rec?: ReturnType<typeof record.start>;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  on<U extends keyof NodeAudioProcessorEvents>(
    event: U, listener: NodeAudioProcessorEvents[U]
  ): this {
    return super.on(event, listener);
  }

  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) return;

      const sampleRate = this.config.sampleRate || 16000;
      const channels = this.config.channels || 1;

      this.rec = record.start({
        sampleRate,
        channels,
        threshold: 0,
        verbose: false,
        recordProgram: process.platform === 'win32' ? 'sox' : 'rec',
        device: undefined,
      });

      // Emit PCM Int16 chunks as ArrayBuffer
      this.rec.stream().on('data', (chunk: Buffer) => {
        // chunk is already 16-bit PCM LE from node-record-lpcm16
        this.emit('data', chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
      });

      this.rec.stream().on('error', (err: unknown) => {
        this.emit('error', err);
      });

      this.isRecording = true;
      console.log('Node audio recording started');
    } catch (error) {
      console.error('Failed to start node audio recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.rec) {
      try {
        record.stop();
      } catch (_) {}
      this.rec = undefined;
    }
    this.isRecording = false;
    console.log('Node audio recording stopped');
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}
