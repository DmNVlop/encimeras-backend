import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { Material, MaterialSchema } from 'src/materials/schemas/material.schema';
import { EdgeProfile, EdgeProfileSchema } from 'src/edge-profiles/schemas/edge-profile.schema';
import { Cutout, CutoutSchema } from 'src/cutouts/schemas/cutout.schema';
import { PriceConfig, PriceConfigSchema } from 'src/price-configs/schemas/price-config.schema';

@Module({
  imports: [
    // 1. Registra todos los schemas que el QuotesService necesita inyectar.
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: EdgeProfile.name, schema: EdgeProfileSchema },
      { name: Cutout.name, schema: CutoutSchema },
      { name: PriceConfig.name, schema: PriceConfigSchema },
    ]),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule { }
