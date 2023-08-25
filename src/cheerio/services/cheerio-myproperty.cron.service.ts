import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface HouseMetadata {
  price: number;
  category: string;
  subcategories: string[];
  bedrooms: number;
  bathrooms: number;
  address?: string;
  buildingSize: number;
  landSize: number;
  subdivisionname?: string;
  furnished: string;
  block?: string;
  carSpaces?: number;
  priceConditions?: string;
  roomsTotal?: number;
  yearBuilt: number;
  sku: string;
  geoPoint?: number[];
  listingTopPosition: boolean;
}

interface LandMetadata {
  price: number;
  category: string;
  address?: string;
  subcategories: string[];
  carSpaces: number;
  buildingSize: number;
  landSize: number;
  sku: string;
  geoPoint: number[];
}

interface WarehouseMetadata {
  price: number;
  category: string;
  subcategories: string[];
  buildingSize?: number;
  landSize?: number;
  furnished: number;
  sku: string;
  geoPoint: number[];
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
  constructor(
    @InjectKysely() private readonly db: DB,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async condominiumWithPaging() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      type TCondominium = MyProperty & {
        metadata: CondominiumMetadata;
      };

      const rows: TCondominium[] = [];

      const scrapeCondominium = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'ilike', '%https://www.myproperty.ph/condominium%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .executeTakeFirst();

      if (!scrapeCondominium) {
        const scrapeDataCount = await this.db
          .selectFrom('scraper_api_data')
          .select(['html_data_id'])
          .where(
            'scrape_url',
            'ilike',
            '%https://www.myproperty.ph/condominium%',
          )
          .limit(1)
          .orderBy('html_data_id', 'desc')
          .executeTakeFirst();

        if (scrapeDataCount) {
          this.logger.log('Deleting scraped condominium data');

          await this.db
            .deleteFrom('scraper_api_data')
            .where(
              'scrape_url',
              'ilike',
              '%https://www.myproperty.ph/condominium%',
            )
            .execute();
        }

        return;
      }

      if (scrapeCondominium) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', scrapeCondominium.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<CondominiumMetadata>(
          scrapeCondominium.html_data,
        );

        const isBuy = scrapeCondominium.scrape_url.includes('buy');

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
  async houseWithPaging() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      type THouse = MyProperty & {
        metadata: HouseMetadata;
      };

      const rows: THouse[] = [];

      const scrapeHouse = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'ilike', '%https://www.myproperty.ph/house%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(5)
        .execute();

      for (const data of scrapeHouse) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<HouseMetadata>(data.html_data);

        const isBuy = data.scrape_url.includes('buy');

        scrapedData.map((item) => rows.push({ ...item, isBuy }));
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
  async apartmentWithPaging() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      type THouse = MyProperty & {
        metadata: HouseMetadata;
      };

      const rows: THouse[] = [];

      const scrapeApartment = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'ilike', '%myproperty.ph/apartment%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(5)
        .execute();

      for (const data of scrapeApartment) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<HouseMetadata>(data.html_data);

        const isBuy = data.scrape_url.includes('buy');

        scrapedData.map((item) => rows.push({ ...item, isBuy }));
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
            property_type_id: PROPERTY_TYPES.Townhouse,
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

          this.logger.log('new townhouse: ' + newHouse.at(0).property_id);
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async landWithPaging() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      type TLand = MyProperty & {
        metadata: LandMetadata;
      };

      const rows: TLand[] = [];

      const scrapeLand = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('scrape_url', 'ilike', '%https://www.myproperty.ph/land%')
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(1)
        .execute();

      for (const data of scrapeLand) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<LandMetadata>(data.html_data);

        const isBuy = data.scrape_url.includes('buy');

        scrapedData.map((item) => rows.push({ ...item, isBuy }));
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

  @Cron(CronExpression.EVERY_5_SECONDS)
  async warehouseWithPaging() {
    try {
      type TWarehouse = MyProperty & {
        metadata: WarehouseMetadata;
      };

      const rows: TWarehouse[] = [];

      const scrapeWarehouse = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where(
          'scrape_url',
          'ilike',
          '%https://www.myproperty.ph/metro-manila/commercial/warehouse%',
        )
        .where('scrape_finish', '=', false)
        .where('finished_at', 'is', null)
        .orderBy('html_data_id', 'desc')
        .limit(5)
        .execute();

      for (const data of scrapeWarehouse) {
        await this.db
          .updateTable('scraper_api_data')
          .set({
            scrape_finish: true,
            finished_at: new Date(),
          })
          .where('html_data_id', '=', data.html_data_id)
          .execute();

        const scrapedData = cheerioMeUp<any>(data.html_data);

        const isBuy = data.scrape_url.includes('buy');

        scrapedData.map((item) => rows.push({ ...item, isBuy }));
      }

      rows.forEach(async (item) => {
        const warehouse = await this.db
          .insertInto('properties')
          .values({
            listing_title: item.title,
            listing_url: item.href,
            property_type_id: PROPERTY_TYPES.Warehouse,
            listing_type_id: item.isBuy
              ? LISTING_TYPES.ForSale
              : LISTING_TYPES.ForRent,
            property_status_id: PROPERTY_STATUS_AVAILABLE,
            turnover_status_id: TURNOVER_STATUS.Unknown,
            current_price: item.metadata.price,
            lot_area: item.metadata.landSize,
            sqm: item.metadata?.landSize ?? item.metadata?.buildingSize,
            city_id: item.address.toLowerCase().includes('bgc')
              ? TAGUIG_CITY
              : UNKNOWN_CITY,
            address: item.address,
            longitude: item.metadata.geoPoint?.[0],
            latitude: item.metadata.geoPoint?.[1],
          })
          .returning(['property_id'])
          .onConflict((oc) => oc.column('listing_url').doNothing())
          .execute();

        if (warehouse.length) {
          await this.db
            .insertInto('unstructured_metadata')
            .values({
              property_id: warehouse.at(0).property_id,
              metadata: JSON.stringify(item.metadata),
            })
            .execute();

          this.logger.log('new warehouse: ' + warehouse.at(0).property_id);
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  // TODO: Move this into a global single property update cron service
  @Cron(CronExpression.EVERY_5_SECONDS)
  async singlePageUpdate() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      const scrapedData = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where((eb) =>
          eb.or([
            eb(
              'scraper_api_data.scrape_url',
              'ilike',
              '%https://www.lamudi.com.ph%',
            ),
            eb(
              'scraper_api_data.scrape_url',
              'ilike',
              '%https://www.myproperty.ph%',
            ),
          ]),
        )
        .where('single_page', '=', true)
        .where('scrape_finish', 'is', false)
        .orderBy('html_data_id', 'desc')
        .limit(5)
        .execute();

      if (scrapedData.length) {
        for (const data of scrapedData) {
          const $ = load(data.html_data);

          const images = [];

          $('.Banner-Images img').each((i, elem) => {
            images.push($(elem).attr('data-src'));
          });

          const firstScriptContent = $('script:first').html();

          // console.log(
          //   firstScriptContent
          //     .replace('dataLayer = ', '')
          //     .replace(/;/g, '')
          //     .trim(),
          // );

          if (firstScriptContent.includes('dataLayer = ')) {
            const locationRegex = /"location":\s*({[\s\S]*?})/;
            const locationMatch = firstScriptContent.match(locationRegex);

            if (locationMatch) {
              const locationString = locationMatch[1];
              if (locationString) {
                try {
                  const city = JSON.parse(locationString)?.city;

                  if (city) {
                    const cityId = await this.db
                      .selectFrom('cities')
                      .select('city_id')
                      .where('name', 'ilike', '%' + city + '%')
                      .executeTakeFirst();

                    if (cityId) {
                      this.logger.log('city id updated: ' + data.scrape_url);

                      await this.db
                        .updateTable('properties')
                        .set({ city_id: cityId.city_id })
                        .where('listing_url', '=', data.scrape_url)
                        .execute();
                    }
                  }
                } catch (error) {
                  this.logger.error(error);
                }
              }
            }

            const descriptionRegex = /"description":\s*({[\s\S]*?})/;
            const descriptionMatch = firstScriptContent.match(descriptionRegex);

            if (descriptionMatch) {
              const descriptionString = descriptionMatch[1];

              try {
                if (descriptionString) {
                  const description = JSON.parse(descriptionString)?.text;

                  if (description) {
                    this.logger.log('description updated: ' + data.scrape_url);

                    await this.db
                      .updateTable('properties')
                      .set({ description })
                      .where('listing_url', '=', data.scrape_url)
                      .execute();
                  }
                }
              } catch (error) {
                this.logger.error(error);
              }
            }
          }

          if (images.length) {
            this.logger.log('images updated: ' + data.scrape_url);

            await this.db
              .updateTable('properties')
              .set({ images })
              .where('listing_url', '=', data.scrape_url)
              .execute();
          }

          await this.db
            .updateTable('scraper_api_data')
            .set({
              scrape_finish: true,
              finished_at: new Date(),
            })
            .where('html_data_id', '=', data.html_data_id)
            .execute();
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
