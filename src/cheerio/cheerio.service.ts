import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CheerioService {
  private readonly logger = new Logger(CheerioService.name);

  @Cron(CronExpression.EVERY_2_HOURS)
  handleCron() {
    this.logger.log('Called every 30 seconds');
  }
}
