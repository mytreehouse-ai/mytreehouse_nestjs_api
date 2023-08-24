import { Module } from '@nestjs/common';
import { ScraperApiCronService } from './services/scraper-api.cron.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ScraperApiController } from './scraper-api.controller';
import { ScraperApiService } from './services/scraper-api.api.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('SCRAPER_API_BASE_URL'),
      }),
    }),
  ],
  controllers: [ScraperApiController],
  providers: [ScraperApiService, ScraperApiCronService],
})
export class ScraperApiModule {}
