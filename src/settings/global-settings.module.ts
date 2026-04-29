import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GlobalSettings, GlobalSettingsSchema } from "./schemas/global-settings.schema";
import { GlobalSettingsService } from "./global-settings.service";
import { GlobalSettingsController } from "./global-settings.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: GlobalSettings.name, schema: GlobalSettingsSchema }])],
  controllers: [GlobalSettingsController],
  providers: [GlobalSettingsService],
  exports: [GlobalSettingsService],
})
export class GlobalSettingsModule {}
