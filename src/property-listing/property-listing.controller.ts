import { Controller, Get, Param, Query } from '@nestjs/common';
import { PropertyListingService } from './property-listing.service';
import { SearchPropertyListingDTO } from 'src/common/dto/searchPropertyListing.dto';
import { GetOnePropertyListingDTO } from 'src/common/dto/getOnePropertyListing.dto';
import { GetPropertyCityListingDTO } from 'src/common/dto/getPropertyCityListing.dto';

@Controller('property-listing')
export class PropertyListingController {
  constructor(
    private readonly propertyListingService: PropertyListingService,
  ) {}

  @Get('search')
  searchPropertyListings(@Query() queryParams: SearchPropertyListingDTO) {
    return this.propertyListingService.searchPropertyListings(queryParams);
  }

  @Get('search/:property_id')
  getOnePropertyListing(@Param() queryParams: GetOnePropertyListingDTO) {
    return this.propertyListingService.getOnePropertyListing(
      queryParams.property_id,
    );
  }

  @Get('property-types')
  getPropertyTypes() {
    return this.propertyListingService.getPropertyTypes();
  }

  @Get('listing-types')
  getListingTypes() {
    return this.propertyListingService.getListingTypes();
  }

  @Get('turnover-status')
  getTurnoverStatus() {
    return this.propertyListingService.getTurnoverStatus();
  }

  @Get('cities')
  getCities(@Query() queryParams: GetPropertyCityListingDTO) {
    return this.propertyListingService.getCities(queryParams.city);
  }
}
