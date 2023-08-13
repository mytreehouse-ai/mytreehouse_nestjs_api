import { Test, TestingModule } from '@nestjs/testing';
import { PropertyListingService } from './property-listing.service';

describe('PropertyListingService', () => {
  let service: PropertyListingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyListingService],
    }).compile();

    service = module.get<PropertyListingService>(PropertyListingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
