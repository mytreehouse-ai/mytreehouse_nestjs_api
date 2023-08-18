import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';
import { SearchPropertyListingType } from 'src/common/dto/searchPropertyListing.dto';

@Injectable()
export class PropertyListingService {
  constructor(@InjectKysely() private readonly db: DB) {}

  async searchPropertyListings(queryParams: SearchPropertyListingType) {
    let query = this.db
      .selectFrom('properties')
      .innerJoin(
        'property_types',
        'property_types.property_type_id',
        'properties.property_type_id',
      )
      .innerJoin(
        'listing_types',
        'listing_types.listing_type_id',
        'properties.listing_type_id',
      )
      .innerJoin(
        'turnover_status',
        'turnover_status.turnover_status_id',
        'properties.turnover_status_id',
      )
      .innerJoin('cities', 'cities.city_id', 'properties.city_id')
      .select([
        'properties.property_id',
        'properties.listing_title',
        'properties.listing_url',
        'property_types.name as property_type_name',
        'listing_types.name as listing_type_name',
        'turnover_status.name as turnover_status_name',
        'properties.current_price',
        'properties.floor_area',
        'properties.lot_area',
        'properties.sqm',
        'properties.bedroom',
        'properties.bathroom',
        'properties.parking_lot',
        'properties.is_corner_lot',
        'properties.studio_type',
        'properties.building_name',
        'properties.year_built',
        'cities.name as city_name',
        'properties.address',
        'properties.is_active',
        'properties.is_cbd',
        'properties.amenities',
        'properties.images',
        'properties.description',
        'properties.longitude',
        'properties.latitude',
        'properties.lease_end',
        'properties.created_at',
      ])
      .limit(5);

    if (queryParams?.property_type) {
      query = query.where(
        'property_types.property_type_id',
        '=',
        queryParams.property_type,
      );
    }

    if (queryParams?.listing_type) {
      query = query.where(
        'listing_types.listing_type_id',
        '=',
        queryParams.listing_type,
      );
    }

    if (queryParams?.turnover_status) {
      query = query.where(
        'turnover_status.turnover_status_id',
        '=',
        queryParams.turnover_status,
      );
    }

    if (queryParams?.has_images) {
      query = query.where('properties.images', 'is not', null);
    }

    if (queryParams?.bedroom_count) {
      query = query.where('properties.bedroom', '=', queryParams.bedroom_count);
    }

    if (queryParams?.bathroom_count) {
      query = query.where(
        'properties.bathroom',
        '=',
        queryParams.bathroom_count,
      );
    }

    if (queryParams?.studio_type) {
      query = query.where(
        'properties.studio_type',
        '=',
        queryParams.studio_type,
      );
    }

    if (queryParams?.is_cbd) {
      query = query.where('properties.is_cbd', '=', queryParams.is_cbd);
    }

    if (queryParams?.city) {
      query = query.where('cities.city_id', '=', queryParams.city);
    }

    if (queryParams?.sqm) {
      query = query.where('properties.sqm', '=', queryParams.sqm);
    }

    if (queryParams?.sqm_min && queryParams?.sqm_max) {
      // TODO: Between function is better implementation
      // https://github.com/kysely-org/kysely/pull/130
      query = query
        .where('properties.sqm', '>=', queryParams.sqm_min)
        .where('properties.sqm', '<=', queryParams.sqm_max);
    }

    if (queryParams?.min_price && !queryParams?.max_price) {
      query = query.where(
        'properties.current_price',
        '>=',
        queryParams.min_price.toString(),
      );
    }

    if (!queryParams?.min_price && queryParams?.max_price) {
      query = query.where(
        'properties.current_price',
        '<=',
        queryParams.max_price.toString(),
      );
    }

    if (queryParams?.min_price && queryParams?.max_price) {
      query = query
        .where(
          'properties.current_price',
          '>=',
          queryParams.min_price.toString(),
        )
        .where(
          'properties.current_price',
          '<=',
          queryParams.max_price.toString(),
        );
    }

    return query.execute();
  }

  async getPropertyTypes() {
    return await this.db
      .selectFrom('property_types')
      .select(['property_type_id', 'name'])
      .execute();
  }

  async getListingTypes() {
    return await this.db
      .selectFrom('listing_types')
      .select(['listing_type_id', 'name'])
      .execute();
  }

  async getTurnoverStatus() {}
}
