import { Module } from "@nestjs/common";
import * as path from "path";
import { join } from "path";

import { ServeStaticModule } from "@nestjs/serve-static";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { MaterialsModule } from "./materials/materials.module";
import { EdgeProfilesModule } from "./edge-profiles/edge-profiles.module";
import { CutoutsModule } from "./cutouts/cutouts.module";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { QuotesModule } from "./quotes/quotes.module";
import { PriceConfigsModule } from "./price-configs/price-configs.module";
import { AttributesModule } from "./attributes/attributes.module";
import { ValidCombinationsModule } from "./valid-combinations/valid-combinations.module";
import { MeasurementRuleSetsModule } from "./measurement-rule-sets/measurement-rule-sets.module";
import { AddonsModule } from "./addons/addons.module";
import { MainPiecesModule } from "./main-pieces/main-pieces.module";
import { DictionariesModule } from "./dictionaries/dictionaries.module";
import { AssetsModule } from "./assets/assets.module";
import { DraftsModule } from "./drafts/drafts.module";
import { OrdersModule } from "./orders/orders.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 2. Especificamos la ruta exacta del archivo .env
      // Esto construye una ruta absoluta desde el directorio del archivo actual
      // hasta la raíz del proyecto y luego al archivo .env
      // envFilePath: path.resolve(__dirname, '..', '.env'), // No funcionó
      envFilePath: path.resolve(process.cwd(), ".env"), // Construye la ruta absoluta al .env
    }),

    // IMAGENES PUBLICAR
    ServeStaticModule.forRoot(
      // 1. Configuración para tus assets públicos (favicon, logos, css, etc.)
      // process.cwd() obtiene la ruta de la raíz del proyecto (donde está el package.json)
      {
        rootPath: join(process.cwd(), "public"), // Apunta a la carpeta 'public' en la raíz del backend
        serveRoot: "/", // (Opcional) Indica que se sirven desde la raíz
      },
    ),

    // MODULOS DEL SISTEMA
    DatabaseModule,
    MaterialsModule,
    EdgeProfilesModule,
    CutoutsModule,
    AuthModule,
    QuotesModule,
    PriceConfigsModule,
    AttributesModule,
    ValidCombinationsModule,
    MeasurementRuleSetsModule,
    AddonsModule,
    MainPiecesModule,
    DictionariesModule,
    AssetsModule,
    DraftsModule,
    OrdersModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
