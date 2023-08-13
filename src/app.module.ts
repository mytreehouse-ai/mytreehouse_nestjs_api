import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema';
import { PropertyValuationModule } from './property-valuation/property-valuation.module';
import { PropertyListingModule } from './property-listing/property-listing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => {
        return configSchema.parse(config);
      },
      envFilePath: ['.env.development.local', '.env.development'],
    }),
    DbModule,
    PropertyValuationModule,
    PropertyListingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
