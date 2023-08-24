import { Controller, Post, Body, Query } from '@nestjs/common';
import { AsyncJobWebhookDTO } from './common/dto/asyncJobWebhook.dto';
import { ScraperApiService } from './services/scraper-api.api.service';
import { AsyncJobQueryDTO } from './common/dto/asyncJobQuery.dto';

@Controller('scraper-api')
export class ScraperApiController {
  constructor(private readonly scraperApiService: ScraperApiService) {}

  @Post('callback')
  asyncJobCallback(
    @Body() body: AsyncJobWebhookDTO,
    @Query() query: AsyncJobQueryDTO,
  ) {
    return this.scraperApiService.asyncJobCallback(body, query);
  }

  @Post('jobs')
  asyncJob(@Body() body: any) {
    console.log(body);

    return 'done';
  }
}
