import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Draft, DraftSchema } from "../drafts/schemas/draft.schema";
import { DataScopeModule } from "../shared/scope/data-scope.module";

@Module({
  imports: [
    DataScopeModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Draft.name, schema: DraftSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
