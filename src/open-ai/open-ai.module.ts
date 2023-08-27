import { Module } from '@nestjs/common';
import { OpenAiCronService } from './open-ai.cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAiApiService } from './open-ai.api.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('OPENAI_BASE_URL'),
        headers: {
          Authorization: `Bearer ${configService.get('OPENAI_API_KEY')}`,
        },
      }),
    }),
  ],
  providers: [OpenAiApiService, OpenAiCronService],
  exports: [OpenAiApiService],
})
export class OpenAiModule {}
