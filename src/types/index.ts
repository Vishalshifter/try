export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  platform: 'zoom' | 'teams' | 'google';
  joinedAt: Date;
  leftAt?: Date;
  isHost: boolean;
}

export interface Meeting {
  id: string;
  platform: 'zoom' | 'teams' | 'google';
  meetingId: string; // Platform-specific meeting ID
  title: string;
  createdBy: string;
  participants: Participant[];
  transcript: string;
  summary?: string;
  actionItems: ActionItem[];
  decisions: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    recordingUrl?: string;
    duration?: number;
    language?: string;
    transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
    summaryStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  completedAt?: Date;
}

export interface TranscriptChunk {
  id: string;
  meetingId: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
  language: string;
}

export interface BotConfig {
  platform: 'zoom' | 'teams' | 'google';
  enabled: boolean;
  credentials: Record<string, string>;
  settings: {
    autoJoin: boolean;
    announceTranscription: boolean;
    recordAudio: boolean;
    language: string;
    sampleRate: number;
    channels: number;
  };
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: 'pcm' | 'wav' | 'mp3';
  chunkSize: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  segments: {
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }[];
}

export interface SummaryResult {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  duration: number;
}

export interface BotStatus {
  platform: 'zoom' | 'teams' | 'google';
  status: 'idle' | 'connecting' | 'connected' | 'recording' | 'error';
  currentMeeting?: string;
  lastActivity: Date;
  error?: string;
}

export interface WebSocketMessage {
  type: 'audio' | 'transcript' | 'status' | 'error';
  data: any;
  timestamp: Date;
  meetingId: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
