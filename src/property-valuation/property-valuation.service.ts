import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/@types';
import { CondominiumPropertyValuationType } from 'src/common/dto/condominiumPropertyValuation.dto';
import { formatPhp } from 'src/common/utils/formatPhp';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PropertyValuationService {
  constructor(
    private readonly configService: ConfigService,
    @InjectKysely() private readonly db: DB,
  ) {}

  async condominium(data: CondominiumPropertyValuationType) {
    const { property_type, listing_type, city, sqm, year_built } = data;

    const CONDOMINIUM_LIFE_SPAN_IN_YEARS = Number(
      this.configService.get('CONDOMINIUM_LIFE_SPAN_IN_YEARS'),
    );
    const CLOSED_TRANSACTION_ID = this.configService.get(
      'CLOSED_TRANSACTION_ID',
    );
    const SOLD_TRANSACTION_ID = this.configService.get('SOLD_TRANSACTION_ID');

    const valuate = await this.db.transaction().execute(async (trx) => {
      let closedTransactionAverage = trx
        .selectFrom('properties')
        .select(({ fn }) => [
          fn.avg('properties.current_price').as('average_price'),
        ])
        .where('properties.current_price', '>', '0')
        .where((eb) =>
          eb.or([
            eb('properties.property_status_id', '=', SOLD_TRANSACTION_ID),
            eb('properties.property_status_id', '=', CLOSED_TRANSACTION_ID),
          ]),
        )
        .where('properties.property_type_id', '=', property_type)
        .where('properties.listing_type_id', '=', listing_type)
        .where('properties.city_id', '=', city);

      closedTransactionAverage = closedTransactionAverage.where(
        sql`properties.current_price is distinct from 'NaN'::numeric`,
      );

      closedTransactionAverage = closedTransactionAverage.where(
        sql`properties.floor_area between ${sqm} * 0.8 and ${sqm} * 1.2`,
      );

      let scrapedTransactionAverage = trx
        .selectFrom('properties')
        .select(({ fn }) => [
          fn.avg('properties.current_price').as('average_price'),
        ])
        .where((eb) =>
          eb.or([
            eb('properties.property_status_id', '!=', SOLD_TRANSACTION_ID),
            eb('properties.property_status_id', '!=', CLOSED_TRANSACTION_ID),
          ]),
        )
        .where('properties.property_type_id', '=', property_type)
        .where('properties.listing_type_id', '=', listing_type)
        .where('properties.city_id', '=', city);

      scrapedTransactionAverage = scrapedTransactionAverage.where(
        sql`properties.current_price is distinct from 'NaN'::numeric`,
      );

      scrapedTransactionAverage = scrapedTransactionAverage.where(
        sql`properties.floor_area between ${sqm} * 0.8 and ${sqm} * 1.2`,
      );

      const closedTransactionAverageResult =
        await closedTransactionAverage.executeTakeFirstOrThrow();

      const scrapedTransactionAverageResult =
        await scrapedTransactionAverage.executeTakeFirstOrThrow();

      const closed = parseFloat(
        closedTransactionAverageResult.average_price?.toString() || '0',
      );

      const scraped = parseFloat(
        scrapedTransactionAverageResult.average_price?.toString() || '0',
      );

      const pricePerSqmInClosedTransaction = closed / sqm;

      const pricePerSqmInScrapedTransaction = scraped / sqm;

      const condoRemainingUsefulLife =
        (CONDOMINIUM_LIFE_SPAN_IN_YEARS -
          (new Date().getFullYear() - year_built)) /
        CONDOMINIUM_LIFE_SPAN_IN_YEARS;

      const appraisalValue =
        (pricePerSqmInClosedTransaction + pricePerSqmInScrapedTransaction) *
        condoRemainingUsefulLife *
        sqm;

      return {
        appraisal_value: formatPhp(appraisalValue),
        price_per_sqm: formatPhp(pricePerSqmInScrapedTransaction),
        sqm,
      };
    });

    return valuate;
  }

  async house() {}

  async townhouse() {}

  async lot() {}
}
