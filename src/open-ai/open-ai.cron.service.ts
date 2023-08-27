import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';
import { OpenAiApiService } from './open-ai.api.service';

@Injectable()
export class OpenAiCronService {
  private readonly logger = new Logger(OpenAiCronService.name);
  constructor(
    private readonly openAiApiService: OpenAiApiService,
    @InjectKysely() private readonly db: DB,
  ) {}

  // TODO: Remove this
  async insertToSinglestoreDb() {
    try {
      const properties = await this.db
        .selectFrom('properties')
        .select([
          'properties.property_id',
          'properties.listing_url',
          'properties.embedding_text',
          'properties.embedding',
        ])
        .where(
          'properties.property_type_id',
          '=',
          'e718f6f2-6f4b-48ae-9dff-93d64d5fb1a8',
        )
        .where('properties.embedding', 'is not', null)
        .where('properties.singlestore_db_migrated', '=', false)
        .limit(25)
        .execute();

      for (const data of properties) {
        const response = await fetch('http://localhost:3000/api/hello', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property_id: data.property_id,
            listing_url: data.listing_url,
            vector: data.embedding,
            text: data.embedding_text,
          }),
        });

        if (response.ok) {
          await this.db
            .updateTable('properties')
            .set({
              singlestore_db_migrated: true,
            })
            .where('properties.property_id', '=', data.property_id)
            .execute();
        }

        console.log(await response.json());
      }
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
        // Temporarily disable for update
        .where((eb) =>
          eb.or([
            eb(
              'properties.property_type_id',
              '=',
              'e718f6f2-6f4b-48ae-9dff-93d64d5fb1a8',
            ),
            eb(
              'properties.property_type_id',
              '=',
              '166968a2-1c59-412c-8a50-4a75f61e56bc',
            ),
          ]),
        )
        .where('properties.ready_to_be_vectorized', '=', true)
        // Temporarily disable for update
        // .where('properties.embedding', 'is', null)
        .where('properties.listing_title', 'is not', null)
        .where('properties.description', 'is not', null)
        .where('properties.embedding_update_rerun', '=', false)
        .limit(50)
        .execute();

      for (const data of properties) {
        const text = `Listing_title: ${data.listing_title} Property_type: ${
          data.property_type
        }, Listing_type: ${data.listing_type}, 
          ${
            data.turnover_status ? data.turnover_status + ',' : ''
          }, Property_status: ${data.property_status}, Sqm: ${
            data.sqm
          }, Floor_area: ${data.floor_area}, Lot_area: ${
            data.lot_area
          }, Bedroom count: ${data.bedroom}, Bathroom count: ${
            data.bathroom
          }, Parking_lot count: ${data.parking_lot}, ${
            data.studio_type ? 'Studio type unit,' : ''
          } Building_name: ${data.building_name}, Year_built: ${
            data.year_built
          }, Current_market_price: ${data.current_price}, Amenities: ${
            data.amenities
          }, Address_location: ${data.address}, City: ${data.city}, ${
            data.located_at_central_business_district
              ? 'Located_at_central_business_district,'
              : ''
          }, Description: ${data.description}, Listing_url: ${data.listing_url}`
          .replace(/\bnull\b/g, 'n/a')
          .replace(/\s+/g, ' ')
          .toLowerCase();

        const vectorized = await this.openAiApiService.createEmbedding(text);

        const updatedProperty = await this.db
          .updateTable('properties')
          .set({
            embedding: JSON.stringify(vectorized.data[0].embedding),
            embedding_text: text,
          })
          .where('properties.property_id', '=', data.property_id)
          .returning('properties.property_id')
          .executeTakeFirst();

        const updateInSinglestoreDb = await fetch(
          'https://beta.mytree.house/api/embedding-update',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              property_id: data.property_id,
              text,
              listing_url: data.listing_url,
              listing_title: data.listing_title,
              vector: vectorized.data[0].embedding,
            }),
          },
        );

        if (updateInSinglestoreDb.ok) {
          this.logger.log(
            'Updated embedding data for property in singlestore db: ' +
              data.property_id,
          );
        }

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
