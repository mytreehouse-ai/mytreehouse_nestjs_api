import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/@types';
import { CondominiumPropertyValuationType } from 'src/common/dto/condominiumPropertyValuation.dto';
import { formatPhp } from 'src/common/utils/formatPhp';

@Injectable()
export class PropertyValuationService {
  constructor(@InjectKysely() private readonly db: DB) {}

  async condominium(data: CondominiumPropertyValuationType) {
    const { property_type, listing_type, city, sqm, year_built } = data;

    const CONDOMINIUM_LIFE_SPAN_IN_YEARS = 50;
    const SOLD_TRANSACTION_ID = '3f49fd58-4060-4cda-bd95-67f612effa9c';
    const CLOSED_TRANSACTION_ID = 'badda289-30a8-4877-a72b-5cb142bf3b96';

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
}
