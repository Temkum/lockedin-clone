import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AudioChunk } from '../shared-types/types';
import axios from 'axios';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly deepgramApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.deepgramApiKey =
      this.configService.getOrThrow<string>('DEEPGRAM_API_KEY');
  }

  async transcribe(audioChunk: AudioChunk): Promise<string> {
    try {
      const buffer = Buffer.from(audioChunk.chunk);

      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true',
        buffer,
        {
          headers: {
            Authorization: `Token ${this.deepgramApiKey}`,
            'Content-Type': 'audio/raw',
            'X-DG-Sample-Rate': String(audioChunk.sampleRate),
            'X-DG-Encoding': 'linear16',
            'X-DG-Channels': '1',
          },
        },
      );

      if (!response.data) {
        throw new Error('No response data from Deepgram');
      }

      const transcript =
        response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
        '';

      return transcript;
    } catch (err) {
      this.logger.error('Deepgram transcription failed', err);
      return '';
    }
  }
}
