import { Module } from '@nestjs/common';
import { CheerioLamudiService } from './cheerio.lamudi.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CheerioLamudiService],
})
export class CheerioModule {}
