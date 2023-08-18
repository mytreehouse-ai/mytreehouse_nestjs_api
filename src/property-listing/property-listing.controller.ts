import { Controller, Get, Query } from '@nestjs/common';
import { PropertyListingService } from './property-listing.service';
import { SearchPropertyListingDTO } from 'src/common/dto/searchPropertyListing.dto';

@Controller('property-listing')
export class PropertyListingController {
  constructor(
    private readonly propertyListingService: PropertyListingService,
  ) {}

  @Get('search')
  searchPropertyListings(@Query() queryParams: SearchPropertyListingDTO) {
    return this.propertyListingService.searchPropertyListings(queryParams);
  }

  @Get('property-types')
  getPropertyTypes() {
    return this.propertyListingService.getPropertyTypes();
  }

  @Get('listing-types')
  getListingTypes() {
    return this.propertyListingService.getListingTypes();
  }
}
