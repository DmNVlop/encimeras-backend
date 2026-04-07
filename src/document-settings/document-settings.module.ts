import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentSettingsService } from "./document-settings.service";
import { DocumentSettingsController } from "./document-settings.controller";
import { DocumentSettings, DocumentSettingsSchema } from "./schemas/document-settings.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: DocumentSettings.name, schema: DocumentSettingsSchema }])],
  controllers: [DocumentSettingsController],
  providers: [DocumentSettingsService],
  exports: [DocumentSettingsService],
})
export class DocumentSettingsModule {}
