import { Test, TestingModule } from '@nestjs/testing';
import { CheerioLamudiService } from './services/cheerio-lamudi.cron.service';

describe('CheerioService', () => {
  let service: CheerioLamudiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheerioLamudiService],
    }).compile();

    service = module.get<CheerioLamudiService>(CheerioLamudiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
