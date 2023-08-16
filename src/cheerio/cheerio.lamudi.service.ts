import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { load } from 'cheerio';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';
import {
  LISTING_TYPES,
  PROPERTY_STATUS_AVAILABLE,
  PROPERTY_TYPES,
  TAGUIG_CITY,
  TURNOVER_STATUS,
  UNKNOWN_CITY,
} from 'src/common/constant';

interface LamudiProperty {
  href: string;
  title: string;
  address: string;
  isBuy: boolean;
}

interface CondominiumMetadata {
  price: number;
  category: string;
  subcategories: string[];
  address?: string;
  furnished: number;
  bedrooms: number;
  bathrooms: number;
  buildingSize: number;
  condominiumname?: string;
  sku: string;
  geoPoint?: number[];
  listingNoPrice?: boolean;
}

interface HouseMetadata {
  price: number;
  category: string;
  subcategories: string[];
  address?: string;
  furnished: number;
  priceConditions?: string;
  yearBuilt?: number;
  bedrooms: number;
  bathrooms: number;
  roomsTotal: number;
  carSpaces?: number;
  buildingSize: number;
  landSize: number;
  sqmRange?: number;
  classification?: number;
  subdivisionname?: string;
  block: string;
  sku: string;
  geoPoint?: number[];
}

interface LandMetadata {
  price: number;
  category: string;
  subcategories: string[];
  address?: string;
  landSize: number;
  sku: string;
  listingNoPrice: boolean;
  geoPoint?: number[];
}

@Injectable()
export class CheerioLamudiService {
  private readonly logger = new Logger(CheerioLamudiService.name);
  constructor(@InjectKysely() private readonly db: DB) {}

  @Cron(CronExpression.EVERY_WEEK)
  async condominium() {
    try {
      type TCondominium = LamudiProperty & { metadata: CondominiumMetadata };

      const rows: TCondominium[] = [];

      const scrapeCondominium = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'like', '%https://www.lamudi.com.ph/condominium%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .execute();

      this.logger.log(
        'scrape condominium row count: ' + scrapeCondominium.length,
      );

      if (!scrapeCondominium.length) return;

      for (const data of scrapeCondominium) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const $ = load(data.html_data);

        $('.card').each((_, element) => {
          const href = $(element).find('.js-listing-link').attr('href');
          const title = $(element)
            .find('.ListingCell-KeyInfo-title')
            .attr('title');
          const address = $(element)
            .find('.ListingCell-KeyInfo-address-text')
            .text()
            .trim();
          const metadata = $(element)
            .find('.ListingCell-AllInfo')
            .data() as unknown as CondominiumMetadata;

          if (!href || !title) return;

          const isBuy = data.scrape_url.includes('buy');

          rows.push({
            href,
            title,
            address,
            isBuy,
            metadata,
          });
        });
      }

      rows.forEach(async (item) => {
        const address = item.metadata?.address ?? item.address;
        const bedroom = Math.floor(item.metadata.bedrooms ?? 0);
        const bathroom = Math.floor(item.metadata.bathrooms ?? 0);

        const newCondominium = await this.db
          .insertInto('properties')
          .values({
            listing_title: item.title,
            listing_url: item.href,
            property_type_id: PROPERTY_TYPES.Condominium,
            listing_type_id: item.isBuy
              ? LISTING_TYPES.ForSale
              : LISTING_TYPES.ForRent,
            property_status_id: PROPERTY_STATUS_AVAILABLE,
            turnover_status_id: TURNOVER_STATUS.Unknown,
            current_price: item.metadata.price,
            floor_area: item.metadata.buildingSize,
            sqm: item.metadata.buildingSize,
            bedroom,
            bathroom,
            studio_type: bedroom === 0,
            is_cbd: address.toLowerCase().includes('bgc'),
            city_id: address.toLowerCase().includes('bgc')
              ? TAGUIG_CITY
              : UNKNOWN_CITY,
            address: address,
            longitude: item.metadata.geoPoint?.[0],
            latitude: item.metadata.geoPoint?.[1],
          })
          .returning(['property_id'])
          .onConflict((oc) => oc.column('listing_url').doNothing())
          .execute();

        if (newCondominium.length) {
          await this.db
            .insertInto('unstructured_metadata')
            .values({
              property_id: newCondominium.at(0).property_id,
              metadata: JSON.stringify(item.metadata),
            })
            .execute();

          this.logger.log(
            'new condominium: ' + newCondominium.at(0).property_id,
          );
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async house() {
    try {
      type THouse = LamudiProperty & {
        metadata: HouseMetadata;
      };

      const rows: THouse[] = [];

      const scrapeHouse = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'like', '%https://www.lamudi.com.ph/house%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .execute();

      this.logger.log('scrape house row count: ' + scrapeHouse.length);

      if (!scrapeHouse.length) return;

      for (const data of scrapeHouse) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const $ = load(data.html_data);

        $('.card').each((_, element) => {
          const href = $(element).find('.js-listing-link').attr('href');
          const title = $(element)
            .find('.ListingCell-KeyInfo-title')
            .attr('title');
          const address = $(element)
            .find('.ListingCell-KeyInfo-address-text')
            .text()
            .trim();
          const metadata = $(element)
            .find('.ListingCell-AllInfo')
            .data() as unknown as HouseMetadata;

          if (!href || !title) return;

          const isBuy = data.scrape_url.includes('buy');

          rows.push({
            href,
            title,
            address,
            isBuy,
            metadata,
          });
        });
      }

      rows.forEach(async (item) => {
        const address = item.metadata?.address ?? item.address;
        const bedroom = Math.floor(item.metadata.bedrooms ?? 0);
        const bathroom = Math.floor(item.metadata.bathrooms ?? 0);

        const newHouse = await this.db
          .insertInto('properties')
          .values({
            listing_title: item.title,
            listing_url: item.href,
            property_type_id: PROPERTY_TYPES.House,
            listing_type_id: item.isBuy
              ? LISTING_TYPES.ForSale
              : LISTING_TYPES.ForRent,
            property_status_id: PROPERTY_STATUS_AVAILABLE,
            turnover_status_id: TURNOVER_STATUS.Unknown,
            current_price: item.metadata.price,
            bedroom,
            bathroom,
            lot_area: item.metadata.buildingSize,
            floor_area: item.metadata.landSize,
            sqm: item.metadata.buildingSize,
            parking_lot: Math.floor(item.metadata?.carSpaces || 0),
            year_built: item.metadata.yearBuilt,
            city_id: address.toLowerCase().includes('bgc')
              ? TAGUIG_CITY
              : UNKNOWN_CITY,
            address,
            longitude: item.metadata.geoPoint?.[0],
            latitude: item.metadata.geoPoint?.[1],
          })
          .returning(['property_id'])
          .onConflict((oc) => oc.column('listing_url').doNothing())
          .execute();

        if (newHouse.length) {
          await this.db
            .insertInto('unstructured_metadata')
            .values({
              property_id: newHouse.at(0).property_id,
              metadata: JSON.stringify(item.metadata),
            })
            .execute();

          this.logger.log('new house: ' + newHouse.at(0).property_id);
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async apartment() {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async land() {
    try {
      type TLand = LamudiProperty & {
        metadata: LandMetadata;
      };

      const rows: TLand[] = [];

      const scrapeLand = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'like', '%https://www.lamudi.com.ph/land%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .execute();

      this.logger.log('scrape land row count: ' + scrapeLand.length);

      if (!scrapeLand.length) return;

      for (const data of scrapeLand) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const $ = load(data.html_data);

        $('.card').each((_, element) => {
          const href = $(element).find('.js-listing-link').attr('href');
          const title = $(element)
            .find('.ListingCell-KeyInfo-title')
            .attr('title');
          const address = $(element)
            .find('.ListingCell-KeyInfo-address-text')
            .text()
            .trim();
          const metadata = $(element)
            .find('.ListingCell-AllInfo')
            .data() as unknown as LandMetadata;

          if (!href || !title) return;

          const isBuy = data.scrape_url.includes('buy');

          rows.push({
            href,
            title,
            address,
            isBuy,
            metadata,
          });
        });
      }

      rows.forEach(async (item) => {
        const address = item.metadata?.address ?? item.address;

        const newLand = await this.db
          .insertInto('properties')
          .values({
            listing_title: item.title,
            listing_url: item.href,
            property_type_id: PROPERTY_TYPES.VacantLot,
            listing_type_id: item.isBuy
              ? LISTING_TYPES.ForSale
              : LISTING_TYPES.ForRent,
            property_status_id: PROPERTY_STATUS_AVAILABLE,
            turnover_status_id: TURNOVER_STATUS.Unknown,
            current_price: item.metadata.price,
            floor_area: item.metadata.landSize,
            sqm: item.metadata.landSize,
            city_id: address.toLowerCase().includes('bgc')
              ? TAGUIG_CITY
              : UNKNOWN_CITY,
            address,
            longitude: item.metadata.geoPoint?.[0],
            latitude: item.metadata.geoPoint?.[1],
          })
          .returning(['property_id'])
          .onConflict((oc) => oc.column('listing_url').doNothing())
          .execute();

        if (newLand.length) {
          await this.db
            .insertInto('unstructured_metadata')
            .values({
              property_id: newLand.at(0).property_id,
              metadata: JSON.stringify(item.metadata),
            })
            .execute();

          this.logger.log('new land: ' + newLand.at(0).property_id);
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
