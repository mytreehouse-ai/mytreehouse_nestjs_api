import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production'], {
    description: 'Node environment',
    required_error: 'NODE_ENV is required',
    invalid_type_error:
      'NODE_ENV must be one of "development", "staging", or "production"',
  }),
  THROTTLE_TTL: z.string({
    description: 'Throttle TTL',
    required_error: 'THROTTLE_TTL is required',
    invalid_type_error: 'THROTTLE_TTL must be a string',
  }),
  THROTTLE_LIMIT: z.string({
    description: 'Throttle limit',
    required_error: 'THROTTLE_LIMIT is required',
    invalid_type_error: 'THROTTLE_LIMIT must be a string',
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
  DATABASE_HOST: z
    .string({
      description: 'Postgres host string',
      required_error: 'DATABASE_HOST is required',
      invalid_type_error: 'DATABASE_HOST must be a string',
    })
    .min(1, {
      message: 'DATABASE_HOST must be at least 1 character',
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
  DATABASE_NAME: z
    .string({
      description: 'Postgres database',
      required_error: 'DATABASE_NAME is required',
      invalid_type_error: 'DATABASE_NAME must be a string',
    })
    .min(1, {
      message: 'DATABASE_NAME must be at least 1 character',
    }),
  DATABASE_PORT: z
    .string({
      description: 'Postgres port',
      required_error: 'DATABASE_PORT is required',
      invalid_type_error: 'DATABASE_PORT must be a string',
    })
    .min(1, {
      message: 'DATABASE_PORT must be at least 1 character',
    }),
  ALLOW_SCRAPING: z.enum(['1', '0'], {
    description: 'Allow scraping',
    required_error: 'ALLOW_SCRAPING is required',
    invalid_type_error: 'ALLOW_SCRAPING must be one of "1" or "0"',
  }),
});

export type Config = z.infer<typeof configSchema>;
