import { Test, TestingModule } from '@nestjs/testing';
import { PropertyListingController } from './property-listing.controller';

describe('PropertyListingController', () => {
  let controller: PropertyListingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyListingController],
    }).compile();

    controller = module.get<PropertyListingController>(PropertyListingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
