import OpenAI from 'openai';
import { TranscriptionResult } from '@/types';

export class TranscriptionService {
  private openai: OpenAI;
  private config: {
    model: string;
    language?: string;
    temperature: number;
    maxRetries: number;
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    });

    this.config = {
      model: 'whisper-1',
      language: 'en',
      temperature: 0,
      maxRetries: 3,
    };
  }

  async transcribeAudio(
    audioBuffer: ArrayBuffer,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<TranscriptionResult> {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: this.createAudioFile(audioBuffer),
        model: this.config.model,
        language: options.language || this.config.language,
        prompt: options.prompt,
        response_format: options.responseFormat || 'verbose_json',
        temperature: this.config.temperature,
      });

      if (options.responseFormat === 'verbose_json' && 'segments' in response) {
        return {
          text: response.text,
          confidence: this.calculateConfidence(response.segments),
          language: response.language || 'en',
          segments: response.segments.map(segment => ({
            start: segment.start,
            end: segment.end,
            text: segment.text,
            confidence: segment.avg_logprob || 0,
          })),
        };
      }

      return {
        text: response.text,
        confidence: 0.9, // Default confidence for non-verbose responses
        language: options.language || 'en',
        segments: [{
          start: 0,
          end: 0,
          text: response.text,
        }],
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transcribeAudioChunks(
    audioChunks: ArrayBuffer[],
    options: {
      language?: string;
      prompt?: string;
      chunkSize?: number;
    } = {}
  ): Promise<TranscriptionResult[]> {
    const chunkSize = options.chunkSize || 30; // 30 seconds per chunk
    const results: TranscriptionResult[] = [];

    for (let i = 0; i < audioChunks.length; i += chunkSize) {
      const chunk = audioChunks.slice(i, i + chunkSize);
      const combinedAudio = this.combineAudioChunks(chunk);
      
      try {
        const result = await this.transcribeAudio(combinedAudio, {
          language: options.language,
          prompt: options.prompt,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to transcribe chunk ${i}:`, error);
        // Continue with other chunks
      }
    }

    return results;
  }

  async transcribeFile(
    filePath: string,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<TranscriptionResult> {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: await this.createFileFromPath(filePath),
        model: this.config.model,
        language: options.language || this.config.language,
        prompt: options.prompt,
        response_format: options.responseFormat || 'verbose_json',
        temperature: this.config.temperature,
      });

      if (options.responseFormat === 'verbose_json' && 'segments' in response) {
        return {
          text: response.text,
          confidence: this.calculateConfidence(response.segments),
          language: response.language || 'en',
          segments: response.segments.map(segment => ({
            start: segment.start,
            end: segment.end,
            text: segment.text,
            confidence: segment.avg_logprob || 0,
          })),
        };
      }

      return {
        text: response.text,
        confidence: 0.9,
        language: options.language || 'en',
        segments: [{
          start: 0,
          end: 0,
          text: response.text,
        }],
      };
    } catch (error) {
      console.error('File transcription failed:', error);
      throw new Error(`File transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createAudioFile(audioBuffer: ArrayBuffer): File {
    // Convert ArrayBuffer to Blob and then to File
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    return new File([blob], 'audio.wav', { type: 'audio/wav' });
  }

  private async createFileFromPath(filePath: string): Promise<File> {
    // This would be implemented for Node.js environments
    // For now, we'll throw an error
    throw new Error('File path transcription not implemented in browser environment');
  }

  private combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    // Simple concatenation of audio chunks
    // In a real implementation, you'd want proper audio mixing
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return combined.buffer;
  }

  private calculateConfidence(segments: any[]): number {
    if (!segments || segments.length === 0) return 0;
    
    const totalConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || 0);
    }, 0);
    
    return totalConfidence / segments.length;
  }

  // Alternative transcription services
  async transcribeWithGoogleSpeech(audioBuffer: ArrayBuffer): Promise<TranscriptionResult> {
    // Implementation for Google Speech-to-Text API
    throw new Error('Google Speech-to-Text not implemented');
  }

  async transcribeWithAWSTranscribe(audioBuffer: ArrayBuffer): Promise<TranscriptionResult> {
    // Implementation for AWS Transcribe
    throw new Error('AWS Transcribe not implemented');
  }

  async transcribeWithLocalWhisper(audioBuffer: ArrayBuffer): Promise<TranscriptionResult> {
    // Implementation for local Whisper model
    throw new Error('Local Whisper not implemented');
  }
}
