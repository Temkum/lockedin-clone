import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async streamSuggestion(
    transcript: string,
    onToken: (token: string, isDone: boolean) => void,
  ): Promise<void> {
    try {
      const stream = await this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are an expert interview coach. 
When given a question from an interviewer, provide a concise, structured answer.
Use the STAR method for behavioral questions.
For technical questions, provide a clear explanation with examples.
Keep answers under 3 paragraphs. Be direct and confident.`,
        messages: [
          {
            role: 'user',
            content: transcript,
          },
        ],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          onToken(event.delta.text, false);
        }
      }

      onToken('', true);
    } catch (err) {
      this.logger.error('AI streaming failed', err);
      onToken('', true);
    }
  }
}
