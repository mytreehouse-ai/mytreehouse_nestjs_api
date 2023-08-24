import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';
import { AsyncJobWebhookType } from '../common/dto/asyncJobWebhook.dto';
import { AsyncJobQueryType } from '../common/dto/asyncJobQuery.dto';

@Injectable()
export class ScraperApiService {
  constructor(@InjectKysely() private readonly db: DB) {}

  async asyncJobCallback(
    data: AsyncJobWebhookType,
    options: AsyncJobQueryType,
  ) {
    console.log(data);
    console.log(options);

    return await this.db
      .insertInto('scraper_api_data')
      .values({
        html_data: data.response.body,
        scraper_api_status: data.status,
        single_page: options.single_page ? options.single_page : false,
        scrape_url: data.url,
      })
      .executeTakeFirst();
  }
}
