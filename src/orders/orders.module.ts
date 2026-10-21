import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "./schemas/order.schema";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { DraftsModule } from "src/drafts/drafts.module";
import { EventsModule } from "src/events/events.module";
import { BullModule } from "@nestjs/bullmq";
import { CartProcessor } from "./processors/cart.processor";
import { CartModule } from "../cart/cart.module";
import { UsersModule } from "../users/users.module";
import { QuotesModule } from "../quotes/quotes.module";
import { forwardRef } from "@nestjs/common";
import { DataScopeModule } from "../shared/scope/data-scope.module";
import { QuoteEventsModule } from "../quote-events/quote-events.module";
import { DisplayNamesModule } from "../shared/display-names/display-names.module";

@Module({
  imports: [
    DraftsModule,
    EventsModule,
    forwardRef(() => CartModule),
    UsersModule,
    QuotesModule,
    DataScopeModule,
    QuoteEventsModule,
    DisplayNamesModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    BullModule.registerQueue({
      name: "cart",
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CartProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
