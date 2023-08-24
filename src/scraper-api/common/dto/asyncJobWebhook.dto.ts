import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AsyncJobWebhookSchema = z.object({
  id: z
    .string({
      description: 'The unique identifier for the async job webhook.',
      required_error: 'The async job webhook id is required.',
      invalid_type_error: 'The async job webhook id must be a string.',
    })
    .uuid({
      message: 'The async job webhook id must be a valid uuid.',
    }),
  attempt: z.number({
    description: 'The number of attempts made to scrape the url.',
    required_error: 'The async job webhook attempt is required.',
    invalid_type_error: 'The async job webhook attempt must be a number.',
  }),
  status: z
    .string({
      description: 'The status of the async job webhook.',
      required_error: 'The async job webhook status is required.',
      invalid_type_error: 'The async job webhook status must be a string.',
    })
    .min(1, {
      message: 'The async job webhook status must be at least 1 character.',
    }),
  statusUrl: z
    .string({
      description: 'The status url of the async job webhook.',
      required_error: 'The async job webhook status url is required.',
      invalid_type_error: 'The async job webhook status url must be a string.',
    })
    .url({
      message: 'The async job webhook status url must be a valid url.',
    }),
  url: z
    .string({
      description: 'The url of the async job webhook.',
      required_error: 'The async job webhook url is required.',
      invalid_type_error: 'The async job webhook url must be a string.',
    })
    .url({
      message: 'The async job webhook url must be a valid url.',
    }),
  response: z.object({
    headers: z.object({}),
    body: z.string({
      description: 'The body of the async job webhook.',
      required_error: 'The async job webhook body is required.',
      invalid_type_error: 'The async job webhook body must be a string.',
    }),
    statusCode: z.number({
      description: 'The status code of the async job webhook.',
      required_error: 'The async job webhook status code is required.',
      invalid_type_error: 'The async job webhook status code must be a number.',
    }),
    credits: z.number({
      description: 'The credits of the async job webhook.',
      required_error: 'The async job webhook credits is required.',
      invalid_type_error: 'The async job webhook credits must be a number.',
    }),
  }),
});

export type AsyncJobWebhookType = z.infer<typeof AsyncJobWebhookSchema>;

export class AsyncJobWebhookDTO extends createZodDto(AsyncJobWebhookSchema) {}
