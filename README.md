# Mytreehouse NestJS API

This is the API documentation for the Mytreehouse NestJS API.

## API Endpoints

### Endpoint 1

- **URL**: `/endpoint1`
- **Method**: `GET`
- **Description**: `Add a brief description of what this endpoint does here.`
- **Query Parameters**: `param1`, `param2`
- **Body**: `{ "key1": "value1", "key2": "value2" }`
- **Response**: `{ "responseKey1": "responseValue1", "responseKey2": "responseValue2" }`

### Endpoint 2

- **URL**: `/endpoint2`
- **Method**: `POST`
- **Description**: `Add a brief description of what this endpoint does here.`
- **Query Parameters**: `param1`, `param2`
- **Body**: `{ "key1": "value1", "key2": "value2" }`
- **Response**: `{ "responseKey1": "responseValue1", "responseKey2": "responseValue2" }`

To generate types for sql queries (fyi: not an orm)

```
teller run pnpm run kysely-codegen
```

aicommits model config

```
aicommits config set model=gpt-3.5-turbo-16k
```
