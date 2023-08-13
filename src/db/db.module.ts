import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_CONNECTION } from 'src/constant';

const dbProvider = {
  provide: PG_CONNECTION,
  useValue: new Pool({
    user: '',
    host: '',
    database: '',
    password: '',
    port: 5432,
  }),
};

@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DbModule {}
