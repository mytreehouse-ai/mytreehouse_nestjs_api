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
  private readonly logger = new Logger(ScraperApiCronService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectKysely() private readonly db: DB,
  ) {}

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
        .limit(5)
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
  async lamudiCondominiumForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/condominium/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiCondominiumForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/condominium/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiHouseForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/house/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiHouseForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/house/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiApartmentForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/apartment/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiApartmentForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/apartment/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiLotForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/lot/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiLotForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/lot/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async lamudiWarehouseForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.lamudi.com.ph/commercial/warehouse/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyCondominiumForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/condominium/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyCondominiumForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/condominium/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyHouseForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/house/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyHouseForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/house/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyApartmentForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/apartment/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyApartmentForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/apartment/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyLandForSale() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/land/buy/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyLandForRent() {
    for (let i = 1; i <= 100; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/land/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async mypropertyPhWarehouseForRent() {
    for (let i = 1; i <= 53; i++) {
      await this.asyncJob({
        urlToScrape: `https://www.myproperty.ph/metro-manila/commercial/warehouse/rent/?page=${i}`,
        singlePage: false,
      });
    }
  }
}
