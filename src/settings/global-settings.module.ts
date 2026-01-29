import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GlobalSettings, GlobalSettingsSchema } from "./schemas/global-settings.schema";
import { GlobalSettingsService } from "./global-settings.service";

// src/settings/global-settings.module.ts
@Module({
  imports: [MongooseModule.forFeature([{ name: GlobalSettings.name, schema: GlobalSettingsSchema }])],
  providers: [GlobalSettingsService],
  exports: [GlobalSettingsService],
})
export class GlobalSettingsModule {}
