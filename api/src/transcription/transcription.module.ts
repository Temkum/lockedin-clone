import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';

@Module({
  providers: [TranscriptionService]
})
export class TranscriptionModule {}
