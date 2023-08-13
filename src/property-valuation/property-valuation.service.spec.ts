import { Test, TestingModule } from '@nestjs/testing';
import { PropertyValuationService } from './property-valuation.service';

describe('PropertyValuationService', () => {
  let service: PropertyValuationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyValuationService],
    }).compile();

    service = module.get<PropertyValuationService>(PropertyValuationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
