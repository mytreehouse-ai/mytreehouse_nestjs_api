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

interface ScraperApiResponse {
  data: {
    attempts: number;
    id: string;
    status: string;
    statusUrl: string;
    url: string;
  };
  statusCode: number;
}

const scraperApi = async (url: string, singlePage?: 'yes' | 'no') => {
  const response = await fetch(
    'https://mth-jupqc.ondigitalocean.app/mth/scraper/async-job',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        urlToScrape: url,
        webhookUrl: `https://mth-jupqc.ondigitalocean.app/mth/scraper/response-catch?singlePage=${
          singlePage === 'yes' ? 'yes' : 'no'
        }`,
      }),
    },
  );

  if (response.ok) {
    const data = (await response.json()) as ScraperApiResponse;

    return data;
  }

  return await Promise.reject('Scraper API failed');
};

@Injectable()
export default class CheerioMyPropertyService {
  private readonly logger = new Logger(CheerioMyPropertyService.name);
  constructor(
    @InjectKysely() private readonly db: DB,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async condominiumWithPaging() {
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
        .executeTakeFirst();

      if (!scrapeCondominium) {
        this.logger.log('no condominium to scrape');

        const scrapeDataCount = await this.db
          .selectFrom('scraper_api_data')
          .select(['html_data_id'])
          .where(
            'scrape_url',
            'like',
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
              'like',
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

  @Cron(CronExpression.EVERY_WEEK)
  async houseWithPaging() {}

  @Cron(CronExpression.EVERY_WEEK)
  async apartmentWithPaging() {}

  @Cron(CronExpression.EVERY_WEEK)
  async landWithPaging() {}

  @Cron(CronExpression.EVERY_WEEK)
  async ScraperApiAsyncJob() {
    try {
      // TODO: Remove this soon when fully deployed
      if (this.configService.get('NODE_ENV') === 'production') {
        return;
      }

      const transactionsNgMamaMo = await this.db
        .transaction()
        .execute(async (trx) => {
          const scrapeCondominium = await trx
            .selectFrom('properties')
            .select(['property_id', 'listing_url', 'property_type_id'])
            .where((eb) =>
              eb.or([
                eb('listing_url', 'like', '%https://www.myproperty.ph%'),
                eb('listing_url', 'like', '%https://www.lamudi.com.ph%'),
              ]),
            )
            .where('scraper_api_async_job_id', 'is', null)
            .where('scraper_api_last_run_date', 'is', null)
            .limit(5)
            .execute();

          if (scrapeCondominium.length) {
            for (const data of scrapeCondominium) {
              const scrapeData = await trx
                .selectFrom('scraper_api_data')
                .select(['html_data_id', 'scrape_url', 'scrape_finish'])
                .where('scrape_url', '=', data.listing_url)
                .executeTakeFirst();

              if (!scrapeData) {
                this.logger.log('no scrape data for: ' + data.property_id);

                const scraperApiResponse = await scraperApi(
                  data.listing_url,
                  'yes',
                );

                if (scraperApiResponse) {
                  await trx
                    .updateTable('properties')
                    .set({
                      scraper_api_async_job_id: scraperApiResponse.data.id,
                      scraper_api_last_run_date: new Date(),
                    })
                    .where('property_id', '=', data.property_id)
                    .execute();
                }
              }
            }
          }

          return 'Transaction done';
        });

      this.logger.log(transactionsNgMamaMo);
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async condominiumSinglePage() {
    try {
      // TODO: Remove this soon when fully deployed
      if (this.configService.get('NODE_ENV') === 'production') {
        return;
      }

      const scrapedData = await this.db
        .selectFrom('scraper_api_data')
        .select(['html_data_id', 'html_data', 'scrape_url'])
        .where('single_page', '=', true)
        .where('scrape_finish', 'is', false)
        .orderBy('html_data_id', 'desc')
        .limit(10)
        .execute();

      this.logger.log(
        'row count single page property update: ' + scrapedData.length,
      );

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
                      .where('name', '=', city)
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

  @Cron(CronExpression.EVERY_WEEK)
  async houseSinglePage() {}

  @Cron(CronExpression.EVERY_WEEK)
  async apartmentSinglePage() {}

  @Cron(CronExpression.EVERY_WEEK)
  async landSinglePage() {}
}