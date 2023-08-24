import { Test, TestingModule } from '@nestjs/testing';
import { ScraperApiCronService } from './services/scraper-api.cron.service';

describe('ScraperApiService', () => {
  let service: ScraperApiCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperApiCronService],
    }).compile();

    service = module.get<ScraperApiCronService>(ScraperApiCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
