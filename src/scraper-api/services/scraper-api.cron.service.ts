import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class ScraperApiCronService {
  private readonly logger = new Logger(ScraperApiCronService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
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
