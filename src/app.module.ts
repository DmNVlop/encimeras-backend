import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MaterialsModule } from './materials/materials.module';
import { EdgeProfilesModule } from './edge-profiles/edge-profiles.module';
import { CutoutsModule } from './cutouts/cutouts.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import * as path from 'path';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    // 2. Especificamos la ruta exacta del archivo .env
    // Esto construye una ruta absoluta desde el directorio del archivo actual
    // hasta la raíz del proyecto y luego al archivo .env
    envFilePath: path.resolve(__dirname, '..', '.env'),
  }), DatabaseModule, MaterialsModule, EdgeProfilesModule, CutoutsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
