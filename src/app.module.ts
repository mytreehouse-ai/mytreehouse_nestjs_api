import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configSchema } from './common/@schema/config.schema';
import { ThrottlerModule } from '@nestjs/throttler';
import { PropertyValuationModule } from './property-valuation/property-valuation.module';
import { PropertyListingModule } from './property-listing/property-listing.module';
import { KyselyPostgresModule } from './common/database/kyselyPostgres.module';
import { CheerioModule } from './cheerio/cheerio.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/guard/throttlerBehindProxy.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return configSchema.parse(config);
      },
      envFilePath: ['.env', '.env.*'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: Number(config.get('THROTTLE_TTL')),
        limit: Number(config.get('THROTTLE_LIMIT')),
      }),
    }),
    KyselyPostgresModule,
    PropertyValuationModule,
    PropertyListingModule,
    CheerioModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    AppService,
  ],
})
export class AppModule {}
