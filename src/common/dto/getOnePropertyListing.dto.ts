import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetOnePropertyListingSchema = z.object({
  property_id: z
    .string({
      description: 'Property id',
      required_error: 'Property id is required',
      invalid_type_error: 'Property id must be a string',
    })
    .uuid({
      message: 'Property id must be a valid uuid',
    }),
});

export type GetOnePropertyListingType = z.infer<
  typeof GetOnePropertyListingSchema
>;

export class GetOnePropertyListingDTO extends createZodDto(
  GetOnePropertyListingSchema,
) {}
