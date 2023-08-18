import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './common/@schema/config.schema';
import { PropertyValuationModule } from './property-valuation/property-valuation.module';
import { PropertyListingModule } from './property-listing/property-listing.module';
import { KyselyPostgresModule } from './common/database/kyselyPostgres.module';
import { CheerioModule } from './cheerio/cheerio.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return configSchema.parse(config);
      },
      envFilePath: ['.env', '.env.*'],
    }),
    KyselyPostgresModule,
    PropertyValuationModule,
    PropertyListingModule,
    CheerioModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    AppService,
  ],
})
export class AppModule {}
