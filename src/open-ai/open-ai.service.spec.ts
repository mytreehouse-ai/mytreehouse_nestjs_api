import { Test, TestingModule } from '@nestjs/testing';
import { OpenAiCronService } from './open-ai.cron.service';

describe('OpenAiService', () => {
  let service: OpenAiCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenAiCronService],
    }).compile();

    service = module.get<OpenAiCronService>(OpenAiCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
