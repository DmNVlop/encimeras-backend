import { Module } from '@nestjs/common';
import { PriceConfigsService } from './price-configs.service';
import { PriceConfigsController } from './price-configs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceConfig, PriceConfigSchema } from './schemas/price-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceConfig.name, schema: PriceConfigSchema }]),
  ],
  controllers: [PriceConfigsController],
  providers: [PriceConfigsService],
})
export class PriceConfigsModule { }
