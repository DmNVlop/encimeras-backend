// import { Module } from "@nestjs/common";
// import { AssetsController } from "./assets.controller";
// import { AssetsService } from "./assets.service";
// import { CloudinaryStorageStrategy } from "./strategies/cloudinary.strategy";

// // import { LocalStorageStrategy } from "./strategies/local-storage.strategy";

// @Module({
//   controllers: [AssetsController],
//   providers: [
//     AssetsService,
//     // Inyección de Dependencia para poder cambiar a S3 luego
//     {
//       provide: "STORAGE_STRATEGY",
//       useClass: CloudinaryStorageStrategy,

//       // useClass: LocalStorageStrategy,
//     },
//   ],
//   exports: [AssetsService],
// })
// export class AssetsModule {}

import { Module, Logger } from "@nestjs/common"; // Importamos Logger
import { AssetsService } from "./assets.service";
import { AssetsController } from "./assets.controller";
import { ConfigModule, ConfigService } from "@nestjs/config"; // Buena práctica usar ConfigService

@Module({
  imports: [ConfigModule], // Importamos ConfigModule si usamos ConfigService
  controllers: [AssetsController],
  providers: [
    AssetsService,
    {
      provide: "STORAGE_STRATEGY",
      // Inyectamos dependencias que nuestras estrategias puedan necesitar
      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("AssetsModule");
        const environment = configService.get("NODE_ENV"); // O process.env.NODE_ENV

        if (environment === "production") {
          logger.log("☁️  Strategy: Cloudinary (Producción)");

          // Lazy Import
          const { CloudinaryStorageStrategy } = await import("./strategies/cloudinary.strategy.js");

          // Instanciamos pasando dependencias si el constructor lo pide
          // O simplemente new CloudinaryStorageStrategy() si no tiene dependencias
          return new CloudinaryStorageStrategy(configService);
        } else {
          logger.log("💻  Strategy: Local Disk (Desarrollo)");

          // Lazy Import
          const { LocalStorageStrategy } = await import("./strategies/local-storage.strategy.js");
          return new LocalStorageStrategy(configService);
        }
      },
    },
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
