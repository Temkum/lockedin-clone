import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillingModule } from './billing/billing.module';
import { AudioModule } from './audio/audio.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { InterviewsModule } from './interviews/interviews.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    BillingModule,
    AudioModule,
    TranscriptionModule,
    AiModule,
    AuthModule,
    InterviewsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
