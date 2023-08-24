import { Module } from '@nestjs/common';
import { CheerioLamudiService } from './services/cheerio-lamudi.cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import CheerioMyPropertyService from './services/cheerio-myproperty.cron.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CheerioLamudiService, CheerioMyPropertyService],
})
export class CheerioModule {}
