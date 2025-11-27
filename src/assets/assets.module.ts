import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { LocalStorageStrategy } from "./strategies/local-storage.strategy";

@Module({
  controllers: [AssetsController],
  providers: [
    AssetsService,
    // Inyección de Dependencia para poder cambiar a S3 luego
    {
      provide: "STORAGE_STRATEGY",
      useClass: LocalStorageStrategy,
    },
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
