import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AnalyticsController } from "./analytics.controller";
import { PortalAnalyticsController } from "./portal-analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { ActivityService } from "./activity.service";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Draft, DraftSchema } from "../drafts/schemas/draft.schema";
import { QuoteEvent, QuoteEventSchema } from "../quote-events/schemas/quote-event.schema";
import { DataScopeModule } from "../shared/scope/data-scope.module";
import { DisplayNamesModule } from "../shared/display-names/display-names.module";

@Module({
  imports: [
    DataScopeModule,
    DisplayNamesModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Draft.name, schema: DraftSchema },
      { name: QuoteEvent.name, schema: QuoteEventSchema },
    ]),
  ],
  controllers: [AnalyticsController, PortalAnalyticsController],
  providers: [AnalyticsService, ActivityService],
})
export class AnalyticsModule {}
