import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MaterialsModule } from './materials/materials.module';
import { EdgeProfilesModule } from './edge-profiles/edge-profiles.module';
import { CutoutsModule } from './cutouts/cutouts.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QuotesModule } from './quotes/quotes.module';
import { PriceConfigsModule } from './price-configs/price-configs.module';
import { AttributesModule } from './attributes/attributes.module';
import { ValidCombinationsModule } from './valid-combinations/valid-combinations.module';
import { MeasurementRuleSetsModule } from './measurement-rule-sets/measurement-rule-sets.module';
import { AddonsModule } from './addons/addons.module';
import { MainPiecesModule } from './main-pieces/main-pieces.module';
import * as path from 'path';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    // 2. Especificamos la ruta exacta del archivo .env
    // Esto construye una ruta absoluta desde el directorio del archivo actual
    // hasta la raíz del proyecto y luego al archivo .env
    // envFilePath: path.resolve(__dirname, '..', '.env'), // No funcionó
    envFilePath: path.resolve(process.cwd(), '.env'), // Construye la ruta absoluta al .env
  }), DatabaseModule, MaterialsModule, EdgeProfilesModule, CutoutsModule, AuthModule, QuotesModule, PriceConfigsModule, AttributesModule, ValidCombinationsModule, MeasurementRuleSetsModule, AddonsModule, MainPiecesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
