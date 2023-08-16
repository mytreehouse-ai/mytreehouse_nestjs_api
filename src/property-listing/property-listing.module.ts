import { Module } from '@nestjs/common';
import { PropertyListingController } from './property-listing.controller';

@Module({
  controllers: [PropertyListingController],
})
export class PropertyListingModule {}
