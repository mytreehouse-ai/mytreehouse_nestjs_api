import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const SearchPropertyListingSchema = z
  .object({
    property_type: z
      .string({
        description: 'Property type id',
        invalid_type_error: 'Property type id must be a string',
      })
      .uuid({
        message: 'Property type id must be a valid uuid',
      }),
    listing_type: z
      .string({
        description: 'Listing type id',
        invalid_type_error: 'Listing type id must be a string',
      })
      .uuid({
        message: 'Listing type id must be a valid uuid',
      }),
    turnover_status: z
      .string({
        description: 'Turnover status id',
        invalid_type_error: 'Turnover status id must be a string',
      })
      .uuid({
        message: 'Turnover status id must be a valid uuid',
      }),
    has_images: z.preprocess(
      (val) => (val === 'true' ? true : false),
      z
        .boolean({
          description: 'Has images',
        })
        .default(false),
    ),
    bedroom_count: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Bedroom count',
          invalid_type_error: 'Bedroom count must be a number',
        })
        .int()
        .positive({
          message: 'Bedroom count must be a positive number',
        }),
    ),
    bathroom_count: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Bathroom count',
          invalid_type_error: 'Bathroom count must be a number',
        })
        .int()
        .positive({
          message: 'Bathroom count must be a positive number',
        }),
    ),
    studio_type: z.preprocess(
      (val) => (val === 'true' ? true : false),
      z
        .boolean({
          description: 'Studio type',
        })
        .default(false),
    ),
    is_cbd: z.preprocess(
      (val) => (val === 'true' ? true : false),
      z
        .boolean({
          description: 'Is Central Business District',
        })
        .default(false),
    ),
    city: z
      .string({
        description: 'City id',
        invalid_type_error: 'City id must be a string',
      })
      .uuid({
        message: 'City id must be a valid uuid',
      }),
    sqm: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Square meter',
          invalid_type_error: 'Square meter must be a number',
        })
        .int()
        .positive({
          message: 'Square meter must be a positive number',
        }),
    ),
    sqm_min: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Square meter min',
          invalid_type_error: 'Square meter min must be a number',
        })
        .int()
        .positive({
          message: 'Square meter min must be a positive number',
        }),
    ),
    sqm_max: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Square meter max',
          invalid_type_error: 'Square meter max must be a number',
        })
        .int()
        .positive({
          message: 'Square meter max must be a positive number',
        }),
    ),
    min_price: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Minimum price',
          invalid_type_error: 'Minimum price must be a number',
        })
        .int()
        .positive({
          message: 'Minimum price must be a positive number',
        }),
    ),
    max_price: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'Maximum price',
          invalid_type_error: 'Maximum price must be a number',
        })
        .int()
        .positive({
          message: 'Maximum price must be a positive number',
        }),
    ),
  })
  .partial()
  .refine(
    (input) => {
      if (input?.sqm_min && !input?.sqm_max) {
        return false;
      }

      if (input?.sqm_max && !input?.sqm_min) {
        return false;
      }

      if (input?.sqm && input?.sqm_min && input?.sqm_max) {
        return false;
      }

      if (input?.sqm_min && input?.sqm_max) {
        const { sqm_min, sqm_max } = input;

        if (sqm_min > sqm_max) {
          return false;
        }
      }

      if (input?.min_price && input?.max_price) {
        const { min_price, max_price } = input;

        if (min_price > max_price) {
          return false;
        }
      }

      return true;
    },
    {
      path: ['sqm_min', 'sqm_max', 'min_price', 'max_price'],
      message:
        'sqm_min and sqm_max must be both present or sqm must not be present if sqm min and max are present',
    },
  );

export type SearchPropertyListingType = z.infer<
  typeof SearchPropertyListingSchema
>;

export class SearchPropertyListingDTO extends createZodDto(
  SearchPropertyListingSchema,
) {}
