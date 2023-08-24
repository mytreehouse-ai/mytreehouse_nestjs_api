import { Test, TestingModule } from '@nestjs/testing';
import { ScraperApiService } from './scraper-api.service';

describe('ScraperApiService', () => {
  let service: ScraperApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperApiService],
    }).compile();

    service = module.get<ScraperApiService>(ScraperApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
