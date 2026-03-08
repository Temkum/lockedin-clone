import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioChunk, Session, WsEvent } from '../shared-types/types';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:1420',
    ],
    credentials: true,
  },
  namespace: '/audio',
})
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AudioGateway.name);
  private activeSessions = new Map<string, Session>();

  constructor(private readonly audioService: AudioService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeSessions.delete(client.id);
  }

  @SubscribeMessage(WsEvent.SESSION_START)
  handleSessionStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() session: Session,
  ) {
    this.activeSessions.set(client.id, session);
    this.logger.log(`Session started: ${session.sessionId}`);
    return { status: 'ok', sessionId: session.sessionId };
  }

  @SubscribeMessage(WsEvent.AUDIO_CHUNK)
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AudioChunk,
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      client.emit(WsEvent.ERROR, { message: 'No active session' });
      return;
    }

    await this.audioService.processChunk(
      data,
      (token: string, isDone: boolean) => {
        client.emit(WsEvent.AI_SUGGESTION, {
          sessionId: data.sessionId,
          token,
          isDone,
        });
      },
    );
  }

  @SubscribeMessage(WsEvent.SESSION_END)
  handleSessionEnd(@ConnectedSocket() client: Socket) {
    this.activeSessions.delete(client.id);
    this.logger.log(`Session ended for client: ${client.id}`);
  }
}
