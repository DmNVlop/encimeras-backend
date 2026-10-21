import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { QuoteEvent, QuoteEventSchema } from "./schemas/quote-event.schema";
import { User, UsersSchema } from "../users/schemas/users.schema";
import { Cart, CartSchema } from "../cart/schemas/cart.schema";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Draft, DraftSchema } from "../drafts/schemas/draft.schema";
import { DataScopeModule } from "../shared/scope/data-scope.module";
import { QuoteEventsService } from "./quote-events.service";
import { QuoteEventsController } from "./quote-events.controller";
import { QuoteEventsBackfillService } from "./quote-events-backfill.service";

/**
 * Trazabilidad de presupuestos. Lee carts/orders/drafts/users por modelo (no por sus módulos)
 * para no crear dependencias circulares: Quotes, Drafts, Cart y Orders importan este módulo.
 */
@Module({
  imports: [
    DataScopeModule,
    MongooseModule.forFeature([
      { name: QuoteEvent.name, schema: QuoteEventSchema },
      { name: User.name, schema: UsersSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Draft.name, schema: DraftSchema },
    ]),
  ],
  controllers: [QuoteEventsController],
  providers: [QuoteEventsService, QuoteEventsBackfillService],
  exports: [QuoteEventsService],
})
export class QuoteEventsModule {}
