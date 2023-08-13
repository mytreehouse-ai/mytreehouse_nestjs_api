import { Test, TestingModule } from '@nestjs/testing';
import { PropertyValuationController } from './property-valuation.controller';

describe('PropertyValuationController', () => {
  let controller: PropertyValuationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyValuationController],
    }).compile();

    controller = module.get<PropertyValuationController>(PropertyValuationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
