import { Controller, Post, Body } from '@nestjs/common';
import { ScraperApiService } from './scraper-api.service';

@Controller('scraper-api')
export class ScraperApiController {
  constructor(private readonly scraperApiService: ScraperApiService) {}

  @Post()
  lamudi(@Body() body: any) {
    console.log(body);

    return body;
  }
}
