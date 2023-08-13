import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production'], {
    description: 'Node environment',
    required_error: 'NODE_ENV is required',
    invalid_type_error:
      'NODE_ENV must be one of "development", "staging", or "production"',
  }),
  DATABASE_URL: z
    .string({
      description: 'Postgres connection string',
      required_error: 'DATABASE_URL is required',
      invalid_type_error: 'DATABASE_URL must be a string',
    })
    .url({
      message: 'DATABASE_URL must be a valid URL',
    }),
  DATABASE_USER: z
    .string({
      description: 'Postgres user',
      required_error: 'DATABASE_USER is required',
      invalid_type_error: 'DATABASE_USER must be a string',
    })
    .min(1, {
      message: 'DATABASE_USER must be at least 1 character',
    }),
  DATABASE_PASS: z
    .string({
      description: 'Postgres password',
      required_error: 'DATABASE_PASS is required',
      invalid_type_error: 'DATABASE_PASS must be a string',
    })
    .min(1, {
      message: 'DATABASE_PASS must be at least 1 character',
    }),
  DATABASE_DB: z
    .string({
      description: 'Postgres database',
      required_error: 'DATABASE_DB is required',
      invalid_type_error: 'DATABASE_DB must be a string',
    })
    .min(1, {
      message: 'DATABASE_DB must be at least 1 character',
    }),
});

export type Config = z.infer<typeof configSchema>;
