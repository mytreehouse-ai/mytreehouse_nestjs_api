import { Inject, Injectable } from '@nestjs/common';
import { PG_CONNECTION } from './constant';

@Injectable()
export class AppService {
  constructor(@Inject(PG_CONNECTION) private conn: any) {}

  getHello(): string {
    return 'Hello World!';
  }
}
