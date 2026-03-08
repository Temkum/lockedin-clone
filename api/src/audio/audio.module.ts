import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { TranscriptionModule } from '../transcription/transcription.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TranscriptionModule, AiModule],
  providers: [AudioService],
})
export class AudioModule {}
