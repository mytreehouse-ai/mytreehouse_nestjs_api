import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class OpenAiApiService {
  private readonly logger = new Logger(OpenAiApiService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createEmbedding(text: string) {
    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .post('/v1/embeddings', {
            model: this.configService.get('OPENAI_EMBEDDING_MODEL'),
            input: text,
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(error.response.data);

              throw 'An error happened in open-ai api';
            }),
          ),
      );

      const data = response as {
        object: string;
        data: Array<{
          object: string;
          index: number;
          embedding: Array<number>;
        }>;
        model: string;
        usage: {
          prompt_tokens: number;
          total_tokens: number;
        };
      };

      return data;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
