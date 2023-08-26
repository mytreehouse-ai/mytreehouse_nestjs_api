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
  SCRAPER_API_BASE_URL: z
    .string({
      description: 'Scraper API base URL',
      required_error: 'SCRAPER_API_BASE_URL is required',
      invalid_type_error: 'SCRAPER_API_BASE_URL must be a string',
    })
    .url({
      message: 'SCRAPER_API_BASE_URL must be a valid URL',
    }),
  SCRAPER_API_KEY: z
    .string({
      description: 'Scraper API key',
      required_error: 'SCRAPER_API_KEY is required',
      invalid_type_error: 'SCRAPER_API_KEY must be a string',
    })
    .min(1, {
      message: 'SCRAPER_API_KEY must be at least 1 character',
    }),
  SCRAPER_API_ASYNC_JOB_CALLBACK: z
    .string({
      description: 'Scraper API async job callback',
      required_error: 'SCRAPER_API_ASYNC_JOB_CALLBACK is required',
      invalid_type_error: 'SCRAPER_API_ASYNC_JOB_CALLBACK must be a string',
    })
    .url({
      message: 'SCRAPER_API_ASYNC_JOB_CALLBACK must be a valid URL',
    }),
  ALLOW_SCRAPING: z.enum(['1', '0'], {
    description: 'Allow scraping',
    required_error: 'ALLOW_SCRAPING is required',
    invalid_type_error: 'ALLOW_SCRAPING must be one of "1" or "0"',
  }),
  CONDOMINIUM_LIFE_SPAN_IN_YEARS: z
    .string({
      description: 'Condominium life span in years',
      required_error: 'CONDOMINIUM_LIFE_SPAN_IN_YEARS is required',
      invalid_type_error: 'CONDOMINIUM_LIFE_SPAN_IN_YEARS must be a string',
    })
    .min(1, {
      message: 'CONDOMINIUM_LIFE_SPAN_IN_YEARS must be at least 1 character',
    }),
  SOLD_TRANSACTION_ID: z
    .string({
      description: 'Sold transaction ID',
      required_error: 'SOLD_TRANSACTION_ID is required',
      invalid_type_error: 'SOLD_TRANSACTION_ID must be a string',
    })
    .uuid({
      message: 'SOLD_TRANSACTION_ID must be a valid UUID',
    }),
  CLOSED_TRANSACTION_ID: z
    .string({
      description: 'Closed transaction ID',
      required_error: 'CLOSED_TRANSACTION_ID is required',
      invalid_type_error: 'CLOSED_TRANSACTION_ID must be a string',
    })
    .uuid({
      message: 'CLOSED_TRANSACTION_ID must be a valid UUID',
    }),
  OPENAI_BASE_URL: z
    .string({
      description: 'OpenAI embedding API URL v1',
      required_error: 'OPENAI_EMBEDDING_API_URL_V1 is required',
      invalid_type_error: 'OPENAI_EMBEDDING_API_URL_V1 must be a string',
    })
    .url({
      message: 'OPENAI_EMBEDDING_API_URL_V1 must be a valid URL',
    }),
  OPENAI_API_KEY: z
    .string({
      description: 'OpenAI API key',
      required_error: 'OPENAI_API_KEY is required',
      invalid_type_error: 'OPENAI_API_KEY must be a string',
    })
    .min(1, {
      message: 'OPENAI_API_KEY must be at least 1 character',
    }),
  OPENAI_EMBEDDING_MODEL: z
    .string({
      description: 'OpenAI embedding model',
      required_error: 'OPENAI_EMBEDDING_MODEL is required',
      invalid_type_error: 'OPENAI_EMBEDDING_MODEL must be a string',
    })
    .min(1, {
      message: 'OPENAI_EMBEDDING_MODEL must be at least 1 character',
    }),
});

export type Config = z.infer<typeof configSchema>;
