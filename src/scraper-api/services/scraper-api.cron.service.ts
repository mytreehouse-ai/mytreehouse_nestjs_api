import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { InjectKysely } from 'nestjs-kysely';
import { catchError, firstValueFrom } from 'rxjs';
import { DB } from 'src/common/@types';

@Injectable()
export class ScraperApiCronService {
  runOnce: boolean;
  private readonly logger = new Logger(ScraperApiCronService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectKysely() private readonly db: DB,
  ) {
    this.runOnce = false;
  }

  private async asyncJob(data: { urlToScrape: string; singlePage: boolean }) {
    const { urlToScrape, singlePage } = data;

    const { data: response } = await firstValueFrom(
      this.httpService
        .post('/jobs', {
          apiKey: this.configService.get('SCRAPER_API_KEY'),
          url: urlToScrape,
          callback: {
            type: 'webhook',
            url: `${this.configService.get(
              'SCRAPER_API_ASYNC_JOB_CALLBACK',
            )}?single_page=${singlePage}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);

            throw 'An error happened in scraper-api async job!';
          }),
        ),
    );

    return response;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async migrateToVercelNeon() {
    try {
      const properties = await this.db
        .selectFrom('properties')
        .select([
          'property_id',
          'listing_title',
          'listing_url',
          'property_type_id',
          'listing_type_id',
          'property_status_id',
          'turnover_status_id',
          'current_price',
          'floor_area',
          'lot_area',
          'sqm',
          'bedroom',
          'bathroom',
          'parking_lot',
          'is_corner_lot',
          'studio_type',
          'building_name',
          'year_built',
          'city_id',
          'address',
          'is_active',
          'is_cbd',
          'amenities',
          'images',
          'description',
          'longitude',
          'latitude',
          'lease_end',
          'created_at',
        ])
        .where('migrated_to_neon', '=', false)
        .orderBy('created_at', 'desc')
        .limit(20)
        .execute();

      properties.forEach(async (property) => {
        const { data: response } = await firstValueFrom(
          this.httpService
            .post('https://mytreehouse.vercel.app/api/properties', property)
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.error(error.response.data);

                throw 'An error happened in inserting data to vercel neon!';
              }),
            ),
        );

        if (response) {
          console.log(response);

          await this.db
            .updateTable('properties')
            .set({ migrated_to_neon: true })
            .where('property_id', '=', property.property_id)
            .execute();
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async updateSingleProperty() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      const outdatedProperties = await this.db
        .selectFrom('properties')
        .select(['properties.property_id', 'properties.listing_url'])
        .where('properties.scraper_api_async_job_id', 'is', null)
        .where('properties.scraper_api_last_run_date', 'is', null)
        .limit(25)
        .execute();

      for (const property of outdatedProperties) {
        const scraperApi = await this.asyncJob({
          urlToScrape: property.listing_url,
          singlePage: true,
        });

        await this.db
          .updateTable('properties')
          .set({
            scraper_api_async_job_id: scraperApi.id,
            scraper_api_last_run_date: new Date(),
          })
          .where('properties.property_id', '=', property.property_id)
          .returning(['properties.property_id'])
          .execute();
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async updateWarehouse() {
    try {
      if (this.configService.get('ALLOW_SCRAPING') === '0') {
        return;
      }

      const warehouses = await this.db
        .selectFrom('properties')
        .select(['properties.property_id'])
        .where(
          'properties.property_type_id',
          '=',
          '166968a2-1c59-412c-8a50-4a75f61e56bc',
        )
        .where('properties.sqm_updated', '=', false)
        .limit(5)
        .execute();

      this.logger.log('Warehouse count: ' + warehouses.length);

      for (const warehouse of warehouses) {
        const unstructuredMetadata = await this.db
          .selectFrom('unstructured_metadata')
          .select('metadata')
          .where(
            'unstructured_metadata.property_id',
            '=',
            warehouse.property_id,
          )
          .executeTakeFirst();

        this.logger.log('Warehouse: ' + JSON.stringify(unstructuredMetadata));

        await this.db
          .updateTable('properties')
          .set({
            sqm_updated: true,
          })
          .where('properties.property_id', '=', warehouse.property_id)
          .execute();

        if (unstructuredMetadata) {
          const data = unstructuredMetadata as {
            metadata: {
              buildingSize?: number;
              landSize?: number;
            };
          };

          const updatedWarehouse = await this.db
            .updateTable('properties')
            .set({
              sqm: data.metadata?.landSize
                ? data.metadata.landSize
                : data.metadata?.buildingSize,
              lot_area: data.metadata?.landSize ? data.metadata.landSize : null,
              // TODO: Transfer this into it's own property called building_size
              floor_area: data.metadata?.buildingSize
                ? data.metadata.buildingSize
                : data.metadata?.landSize,
            })
            .where('properties.property_id', '=', warehouse.property_id)
            .returning('properties.property_id')
            .executeTakeFirst();

          this.logger.log('Updated warehouse: ' + updatedWarehouse.property_id);
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiParanuqueBfHomes() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/metro-manila/paranaque/b-f-homes/house/buy/?script=23&page=${i}`,
        singlePage: false,
      });
    }

    this.logger.log('Lamudi Paranuque Bf Homes.');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiCondominiumForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/condominium/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiCondominiumForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/condominium/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiHouseForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/house/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiHouseForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/house/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiApartmentForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/apartment/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiApartmentForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/apartment/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiLotForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/lot/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiLotForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/lot/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiWarehouseForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 25; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/commercial/warehouse/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiWarehouseForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/commercial/warehouse/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyCondominiumForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/condominium/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyCondominiumForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/condominium/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyHouseForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/house/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyHouseForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/house/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyApartmentForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/apartment/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyApartmentForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/apartment/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyLandForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/land/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyLandForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/land/rent/?page=${i}`,
        singlePage: false,
      });

      console.log(i);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyPhWarehouseForSale() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 28; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/commercial/warehouse/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyPhWarehouseForRent() {
    if (this.configService.get('ALLOW_SCRAPING') === '0') {
      return;
    }

    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/commercial/warehouse/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }
}
