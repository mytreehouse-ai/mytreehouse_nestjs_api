import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from './common/@types';

@Injectable()
export class AppService {
  constructor(@InjectKysely() private readonly db: DB) {}

  async getCities() {
    const cities = await this.db.selectFrom('cities').selectAll().execute();

    return cities;
  }
}
