import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Draft, DraftSchema } from "../drafts/schemas/draft.schema";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Draft.name, schema: DraftSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
