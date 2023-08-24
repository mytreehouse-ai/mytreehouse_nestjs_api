import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AsyncJobQuerySchema = z
  .object({
    single_page: z.preprocess(
      (input) => input === 'true',
      z
        .boolean({
          description: 'The single page of the async job query.',
          invalid_type_error:
            'The async job query single page must be a boolean.',
        })
        .default(false),
    ),
  })
  .partial();

export type AsyncJobQueryType = z.infer<typeof AsyncJobQuerySchema>;

export class AsyncJobQueryDTO extends createZodDto(AsyncJobQuerySchema) {}
