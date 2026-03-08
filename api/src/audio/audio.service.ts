import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionService } from '../transcription/transcription.service';
import { AiService } from '../ai/ai.service';
import { AudioChunk } from '../shared-types/types';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly aiService: AiService,
  ) {}

  async processChunk(
    chunk: AudioChunk,
    onToken: (token: string, isDone: boolean) => void,
  ): Promise<void> {
    try {
      const transcript = await this.transcriptionService.transcribe(chunk);

      if (!transcript || transcript.trim().length === 0) return;

      await this.aiService.streamSuggestion(transcript, onToken);
    } catch (err) {
      this.logger.error('Failed to process audio chunk', err);
    }
  }
}
