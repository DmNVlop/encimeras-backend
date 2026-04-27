import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FactorySettingsService } from "./factory-settings.service";
import { FactorySettingsController } from "./factory-settings.controller";
import { FactorySettings, FactorySettingsSchema } from "./schemas/factory-settings.schema";
import { AssetsModule } from "../assets/assets.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FactorySettings.name, schema: FactorySettingsSchema }]),
    AssetsModule,
  ],
  controllers: [FactorySettingsController],
  providers: [FactorySettingsService],
  exports: [FactorySettingsService],
})
export class FactorySettingsModule {}
