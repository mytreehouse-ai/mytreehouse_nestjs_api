import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';

@Injectable()
export class PropertyListingService {
  constructor(@InjectKysely() private readonly db: DB) {}
}
