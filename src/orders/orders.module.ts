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

@Module({
  imports: [
    DraftsModule,
    EventsModule,
    forwardRef(() => CartModule),
    UsersModule,
    QuotesModule,
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
