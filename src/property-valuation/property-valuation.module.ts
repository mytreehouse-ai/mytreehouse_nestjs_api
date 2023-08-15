import { Module } from '@nestjs/common';
import { PropertyValuationService } from './property-valuation.service';
import { PropertyValuationController } from './property-valuation.controller';

@Module({
  providers: [PropertyValuationService],
  controllers: [PropertyValuationController],
})
export class PropertyValuationModule {}
