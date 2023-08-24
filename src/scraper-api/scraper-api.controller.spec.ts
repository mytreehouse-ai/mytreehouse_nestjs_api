import { Test, TestingModule } from '@nestjs/testing';
import { ScraperApiController } from './scraper-api.controller';
import { ScraperApiCronService } from './services/scraper-api.cron.service';

describe('ScraperApiController', () => {
  let controller: ScraperApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScraperApiController],
      providers: [ScraperApiCronService],
    }).compile();

    controller = module.get<ScraperApiController>(ScraperApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
