import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/@types';
import { SearchPropertyListingType } from 'src/common/dto/searchPropertyListing.dto';
import { UNKNOWN_CITY } from 'src/common/constant';

@Injectable()
export class PropertyListingService {
  constructor(@InjectKysely() private readonly db: DB) {}

  private searchPropertyListingQueryBuilder() {
    return this.db
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
      ]);
  }

  async searchPropertyListings(queryParams: SearchPropertyListingType) {
    const rawQuery = await sql`
      SELECT
        p.property_id,
        p.listing_title,
        p.listing_url,
        pt.name AS property_type_name,
        lt.name AS listing_type_name,
        ts.name AS turnover_status_name,
        p.current_price,
        p.floor_area,
        p.lot_area,
        p.sqm,
        p.bedroom,
        p.bathroom,
        p.parking_lot,
        p.is_corner_lot,
        p.studio_type,
        p.building_name,
        p.year_built,
        ct.name AS city_name,
        p.address,
        p.is_active,
        p.is_cbd,
        p.amenities,
        p.images,
        p.description,
        p.longitude,
        p.latitude,
        p.lease_end,
        p.created_at,
        ts_rank(to_tsvector('english', p.listing_title || ' ' || coalesce(p.description, '')), websearch_to_tsquery('bf homes')) AS rank
      FROM properties p
      INNER JOIN property_types pt ON pt.property_type_id = p.property_type_id
      INNER JOIN listing_types lt ON lt.listing_type_id = p.listing_type_id
      INNER JOIN turnover_status ts ON ts.turnover_status_id = p.turnover_status_id
      INNER JOIN cities ct ON ct.city_id = p.city_id
      WHERE p.images IS NOT NULL AND
      p.longitude IS NOT NULL AND
      p.latitude IS NOT NULL AND
      p.city_id != ${UNKNOWN_CITY} AND
      p.current_price IS DISTINCT FROM 'NaN'::NUMERIC
      ${
        queryParams?.ilike
          ? sql`
      AND to_tsvector('english', p.listing_title || ' ' || coalesce(p.description, '')) @@ websearch_to_tsquery('bf homes')
      `
          : sql``
      }
      ${
        queryParams?.property_type
          ? sql`
      AND p.property_type_id = ${queryParams.property_type}
      `
          : sql``
      }
      ${
        queryParams?.listing_type
          ? sql`
      AND p.listing_type_id = ${queryParams.listing_type}
      `
          : sql``
      }
      ${
        queryParams?.turnover_status
          ? sql`
      AND p.turnover_status_id = ${queryParams.turnover_status}
      `
          : sql``
      }
      ${
        queryParams?.bedroom_count
          ? sql`
        AND p.bedroom = ${queryParams.bedroom_count}
        `
          : sql``
      }
      ${
        queryParams?.bathroom_count
          ? sql`
      AND p.bathroom = ${queryParams.bathroom_count}
      `
          : sql``
      }
      ${
        queryParams?.studio_type
          ? sql`
      AND p.studio_type = ${queryParams.studio_type}
      `
          : sql``
      }
      ${
        queryParams?.is_cbd
          ? sql`
      AND p.is_cbd = ${queryParams.is_cbd}
      `
          : sql``
      }
      ${
        queryParams?.city
          ? sql`
      AND p.city_id = ${queryParams.city}
      `
          : sql``
      }
      ${
        queryParams?.sqm
          ? sql`
      AND p.sqm = ${queryParams.sqm}
      `
          : sql``
      }
      ${
        queryParams?.sqm_min && queryParams?.sqm_max
          ? sql`
      AND p.sqm BETWEEN ${queryParams.sqm_min} AND ${queryParams.sqm_max}
      `
          : sql``
      }
      ORDER BY p.created_at DESC LIMIT ${
        queryParams?.page_limit ? queryParams.page_limit : 100
      }
    `.execute(this.db);

    return rawQuery.rows;
  }

  async getOnePropertyListing(propertyId: string) {
    const query = this.searchPropertyListingQueryBuilder();

    return await query
      .where('properties.property_id', '=', propertyId)
      .executeTakeFirst();
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

  async getTurnoverStatus() {
    return await this.db
      .selectFrom('turnover_status')
      .select(['turnover_status_id', 'name'])
      .execute();
  }

  async getCities(city: string) {
    let query = this.db.selectFrom('cities').select(['city_id', 'name']);

    if (city) {
      query = query.where('cities.name', 'ilike', '%' + city + '%');
    }

    query = query.where(
      sql`properties.current_price is distinct from 'NaN'::numeric`,
    );

    return await query.orderBy('cities.name', 'asc').limit(25).execute();
  }
}
