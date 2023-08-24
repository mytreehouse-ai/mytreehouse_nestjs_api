import { Module } from '@nestjs/common';
import { ScraperApiService } from './scraper-api.service';
import { ScraperApiController } from './scraper-api.controller';

@Module({
  controllers: [ScraperApiController],
  providers: [ScraperApiService],
})
export class ScraperApiModule {}
