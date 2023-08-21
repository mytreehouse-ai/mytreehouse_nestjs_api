import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CondominiumPropertyValuationSchema = z
  .object({
    property_type: z
      .string({
        description: 'The property type of the condominium.',
        required_error: 'Property type is required.',
        invalid_type_error: 'Property type must be a string.',
      })
      .uuid({
        message: 'Property type must be a valid UUID.',
      }),
    listing_type: z
      .string({
        description: 'The listing type of the condominium.',
        required_error: 'Listing type is required.',
        invalid_type_error: 'Listing type must be a string.',
      })
      .uuid({
        message: 'Listing type must be a valid UUID.',
      }),
    city: z
      .string({
        description: 'The city of the condominium.',
        required_error: 'City is required.',
        invalid_type_error: 'City must be a string.',
      })
      .uuid({
        message: 'City must be a valid UUID.',
      }),
    sqm: z
      .number({
        description: 'The sqm of the condominium.',
        required_error: 'Sqm is required.',
        invalid_type_error: 'Sqm must be a number.',
      })
      .min(1, {
        message: 'Sqm must be greater than 0.',
      }),
    year_built: z
      .number({
        description: 'The year built of the condominium.',
        required_error: 'Year built is required.',
        invalid_type_error: 'Year built must be a number.',
      })
      .min(1, {
        message: 'Year built must be greater than 0.',
      }),
  })
  .refine(
    (input) => {
      if (input.year_built > new Date().getFullYear()) {
        return false;
      }

      return true;
    },
    {
      path: ['year_built'],
      message: 'Year built must be less than or equal to the current year.',
    },
  );

export type CondominiumPropertyValuationType = z.infer<
  typeof CondominiumPropertyValuationSchema
>;

export class CondominiumPropertyValuationDTO extends createZodDto(
  CondominiumPropertyValuationSchema,
) {}
