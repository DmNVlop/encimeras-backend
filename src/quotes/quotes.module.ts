import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { MaterialsModule } from 'src/materials/materials.module';
import { PriceConfigsModule } from 'src/price-configs/price-configs.module';
import { AddonsModule } from 'src/addons/addons.module';
import { MeasurementRuleSetsModule } from 'src/measurement-rule-sets/measurement-rule-sets.module';
import { MainPiecesModule } from 'src/main-pieces/main-pieces.module';

@Module({
  imports: [
    MaterialsModule,
    PriceConfigsModule,
    AddonsModule,
    MeasurementRuleSetsModule,
    MainPiecesModule, // El nuevo servicio para crear tramos
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule { }
