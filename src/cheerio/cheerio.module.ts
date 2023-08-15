import { Module } from '@nestjs/common';
import { CheerioService } from './cheerio.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CheerioService],
})
export class CheerioModule {}
