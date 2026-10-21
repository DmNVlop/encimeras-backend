import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Draft, DraftSchema } from "./schemas/draft.schema";
import { DraftsController } from "./drafts.controller";
import { DraftsService } from "./drafts.service";
import { GlobalSettingsModule } from "src/settings/global-settings.module";
import { QuotesModule } from "src/quotes/quotes.module";
import { QuoteEventsModule } from "src/quote-events/quote-events.module";

@Module({
  imports: [
    GlobalSettingsModule, // Trae GlobalSettingsService
    QuotesModule, // Trae QuotesService (o PricingService)
    QuoteEventsModule, // Trazabilidad: evento DRAFT_SAVED
    MongooseModule.forFeature([{ name: Draft.name, schema: DraftSchema }]),
  ],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
