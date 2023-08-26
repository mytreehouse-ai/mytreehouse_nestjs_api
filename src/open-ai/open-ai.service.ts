import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { InjectKysely } from 'nestjs-kysely';
import { catchError, firstValueFrom } from 'rxjs';
import { DB } from 'src/common/@types';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectKysely() private readonly db: DB,
  ) {}

  async textToVector(text: string) {
    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .post('/v1/embeddings', {
            model: this.configService.get('OPENAI_EMBEDDING_MODEL'),
            input: text,
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(error.response.data);

              throw 'An error happened in open-ai api!';
            }),
          ),
      );

      const data = response as {
        object: string;
        data: Array<{
          object: string;
          index: number;
          embedding: Array<number>;
        }>;
        model: string;
        usage: {
          prompt_tokens: number;
          total_tokens: number;
        };
      };

      return data;
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async updateRecordsWithEmbeddings() {
    try {
      const properties = await this.db
        .selectFrom('properties')
        .innerJoin(
          'property_types',
          'properties.property_type_id',
          'property_types.property_type_id',
        )
        .innerJoin(
          'listing_types',
          'properties.listing_type_id',
          'listing_types.listing_type_id',
        )
        .innerJoin(
          'property_status',
          'properties.property_status_id',
          'property_status.property_status_id',
        )
        .innerJoin(
          'turnover_status',
          'properties.turnover_status_id',
          'turnover_status.turnover_status_id',
        )
        .innerJoin('cities', 'properties.city_id', 'cities.city_id')
        .select([
          'properties.property_id',
          'properties.listing_title',
          'properties.listing_url',
          'property_types.name as property_type',
          'listing_types.name as listing_type',
          'turnover_status.name as turnover_status',
          'property_status.name as property_status',
          'properties.sqm',
          'properties.floor_area',
          'properties.lot_area',
          'properties.bedroom',
          'properties.bathroom',
          'properties.parking_lot',
          'properties.studio_type',
          'properties.building_name',
          'properties.year_built',
          'properties.current_price',
          'properties.amenities',
          'properties.address',
          'cities.name as city',
          'properties.is_cbd as located_at_central_business_district',
          'properties.description',
        ])
        .where('properties.embedding', 'is', null)
        .limit(25)
        .execute();

      for (const data of properties) {
        const text = `Property_type: ${data.property_type}, Listing_type: ${
          data.listing_type
        }, Turnover_status: ${data.turnover_status}, Property_status: ${
          data.property_status
        }, Sqm: ${data.sqm}, Floor_area: ${data.floor_area}, Lot_area: ${
          data.lot_area
        }, Bedroom: ${data.bedroom}, Bathroom: ${data.bathroom}, Parking_lot: ${
          data.parking_lot
        }, ${data.studio_type ? 'Studio type,' : ''} Building_name: ${
          data.building_name
        }, Year_built: ${data.year_built}, Current_price: ${
          data.current_price
        }, Amenities: ${data.amenities}, Address: ${data.address}, City: ${
          data.city
        }, ${
          data.located_at_central_business_district
            ? 'Located_at_central_business_district,'
            : ''
        }, Description: ${data.description}, Listing_url: ${data.listing_url}`
          .replace(/\bnull\b/g, 'n/a')
          .replace(/\s+/g, ' ')
          .toLowerCase();

        const vectorized = await this.textToVector(text);

        const updatedProperty = await this.db
          .updateTable('properties')
          .set({
            embedding: JSON.stringify(vectorized.data[0].embedding),
            embedding_text: text,
          })
          .where('properties.property_id', '=', data.property_id)
          .returning('properties.property_id')
          .executeTakeFirst();

        this.logger.log(
          'Updated text embedding data for property: ' +
            updatedProperty.property_id,
        );
      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
