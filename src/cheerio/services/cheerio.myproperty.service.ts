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

interface MyProperty {
  href: string;
  title: string;
  address: string;
  isBuy: boolean;
}

interface CondominiumMetadata {
  price: number;
  category: string;
  subcategories: string[];
  deposit: number;
  address?: string;
  furnished: string;
  floor?: number;
  floorsTotal?: number;
  classification?: string;
  bedrooms: number;
  bathrooms?: number;
  roomsTotal?: number;
  buildingSize: number;
  condominiumname?: string;
  priceConditions?: string;
  towerName?: string;
  block: string;
  sku: string;
  geoPoint?: number[];
  listingNoPrice?: boolean;
}

function cheerioMeUp<T>(htmlData: string): {
  href: string;
  title: string;
  address: string;
  metadata: T;
}[] {
  if (!htmlData) return;

  const scrapedProperties = [];

  const $ = load(htmlData);

  $('.card').each((_, element) => {
    const href = $(element).find('.js-listing-link').attr('href');
    const title = $(element).find('.ListingCell-KeyInfo-title').attr('title');
    const address = $(element)
      .find('.ListingCell-KeyInfo-address-text')
      .text()
      .trim();
    const metadata = $(element).find('.ListingCell-AllInfo').data();

    if (!href || !title) return;

    scrapedProperties.push({ href, title, address, metadata });
  });

  return scrapedProperties;
}

@Injectable()
export default class CheerioMyPropertyService {
  private readonly logger = new Logger(CheerioMyPropertyService.name);
  constructor(@InjectKysely() private readonly db: DB) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async condominium() {
    try {
      type TCondominium = MyProperty & {
        metadata: CondominiumMetadata;
      };

      const rows: TCondominium[] = [];

      const scrapeCondominium = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'like', '%https://www.myproperty.ph/condominium%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .execute();

      this.logger.log('condominium row count: ' + scrapeCondominium.length);

      if (!scrapeCondominium.length) {
        this.logger.log('no condominium to scrape');

        await this.db
          .deleteFrom('scraper_api_data')
          .where(
            'scrape_url',
            'like',
            '%https://www.myproperty.ph/condominium%',
          )
          .execute();

        return;
      }

      for (const data of scrapeCondominium) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<CondominiumMetadata>(data.html_data);

        const isBuy = data.scrape_url.includes('buy');

        scrapedData.map((item) => rows.push({ ...item, isBuy }));
      }

      rows.forEach(async (item) => {
        const address = item.metadata?.address ?? item.address;
        const bedroom = Math.floor(item.metadata.bedrooms ?? 0);
        const bathroom = Math.floor(item.metadata?.bathrooms ?? 0);

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

  @Cron(CronExpression.EVERY_5_SECONDS)
  async house() {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async apartment() {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async land() {}
}
