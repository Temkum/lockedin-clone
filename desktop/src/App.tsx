import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { io, Socket } from 'socket.io-client';
import { WsEvent } from './common/types';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SESSION_ID = crypto.randomUUID();

interface AudioChunkPayload {
  chunk: number[];
  sampleRate: number;
  timestamp: number;
}

export default function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to NestJS WebSocket
    const socket = io(`${API_URL}/audio`, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Connected to API');
      socket.emit(WsEvent.SESSION_START, {
        sessionId: SESSION_ID,
        userId: 'local-user', // replace with real auth
        startedAt: Date.now(),
        mode: 'live',
      });
    });

    socket.on(
      WsEvent.AI_SUGGESTION,
      (data: { token: string; isDone: boolean }) => {
        if (data.isDone) {
          setIsStreaming(false);
          return;
        }
        setIsStreaming(true);
        setSuggestion((prev) => prev + data.token);
      },
    );

    socket.on(WsEvent.ERROR, (err: { message: string }) => {
      console.error('WS Error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Listen for audio chunks emitted by Rust
    let unlisten: () => void;

    listen<AudioChunkPayload>('audio-chunk', (event) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;

      socket.emit(WsEvent.AUDIO_CHUNK, {
        sessionId: SESSION_ID,
        chunk: event.payload.chunk,
        sampleRate: event.payload.sampleRate,
        timestamp: event.payload.timestamp,
      });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const startCapture = async () => {
    try {
      await invoke('start_audio_capture');
      setIsCapturing(true);
      setSuggestion('');
      setTranscript('');
    } catch (err) {
      console.error('Failed to start capture:', err);
    }
  };

  const stopCapture = async () => {
    try {
      await invoke('stop_audio_capture');
      setIsCapturing(false);
    } catch (err) {
      console.error('Failed to stop capture:', err);
    }
  };

  return (
    <div className="overlay-container">
      <div className="header">
        <span className="title">Interview Copilot</span>
        <button
          className={`capture-btn ${isCapturing ? 'active' : ''}`}
          onClick={isCapturing ? stopCapture : startCapture}
        >
          {isCapturing ? 'Stop' : 'Start'}
        </button>
      </div>

      {suggestion && (
        <div className="suggestion-box">
          <p className="suggestion-text">
            {suggestion}
            {isStreaming && <span className="cursor">|</span>}
          </p>
        </div>
      )}

      {!suggestion && isCapturing && (
        <div className="listening">
          <span>Listening...</span>
        </div>
      )}
    </div>
  );
}
