export interface AudioChunk {
  sessionId: string;
  chunk: number[];
  timestamp: number;
  sampleRate: number;
}

export interface AISuggestionChunk {
  sessionId: string;
  token: string;
  isDone: boolean;
}

export const WsEvent = {
  AUDIO_CHUNK: 'audio_chunk',
  TRANSCRIPT: 'transcript',
  AI_SUGGESTION: 'ai_suggestion',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  ERROR: 'ws_error',
} as const;

export type WsEvent = (typeof WsEvent)[keyof typeof WsEvent];

export interface Session {
  sessionId: string;
  userId: string;
  startedAt: number;
  mode: 'live' | 'mock';
}
