import { Module } from '@nestjs/common';
import { PropertyListingController } from './property-listing.controller';
import { PropertyListingService } from './property-listing.service';

@Module({
  controllers: [PropertyListingController],
  providers: [PropertyListingService],
})
export class PropertyListingModule {}
