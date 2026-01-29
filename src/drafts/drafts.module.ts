import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Draft, DraftSchema } from "./schemas/draft.schema";
import { DraftsController } from "./drafts.controller";
import { DraftsService } from "./drafts.service";
import { GlobalSettingsModule } from "src/settings/global-settings.module";
import { QuotesModule } from "src/quotes/quotes.module";

@Module({
  imports: [
    GlobalSettingsModule, // Trae GlobalSettingsService
    QuotesModule, // Trae QuotesService (o PricingService)
    MongooseModule.forFeature([{ name: Draft.name, schema: DraftSchema }]),
  ],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
