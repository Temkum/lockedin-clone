// Audio events sent from desktop to API
export interface AudioChunk {
  sessionId: string;
  chunk: number[]; // raw PCM bytes as array for JSON transport
  timestamp: number;
  sampleRate: number;
}

// Transcript coming back from Deepgram
export interface TranscriptEvent {
  sessionId: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

// AI suggestion streamed back to desktop
export interface AISuggestionChunk {
  sessionId: string;
  token: string;
  isDone: boolean;
}

// WebSocket event types
export enum WsEvent {
  AUDIO_CHUNK = 'audio_chunk',
  TRANSCRIPT = 'transcript',
  AI_SUGGESTION = 'ai_suggestion',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  ERROR = 'ws_error',
}

// Session metadata
export interface Session {
  sessionId: string;
  userId: string;
  startedAt: number;
  mode: 'live' | 'mock';
}
