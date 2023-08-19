import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetPropertyCityListingSchema = z
  .object({
    city: z
      .string({
        description: 'City name',
        invalid_type_error: 'City id must be a string',
      })
      .min(1),
  })
  .partial();

export type GetPropertyCityListingType = z.infer<
  typeof GetPropertyCityListingSchema
>;

export class GetPropertyCityListingDTO extends createZodDto(
  GetPropertyCityListingSchema,
) {}
