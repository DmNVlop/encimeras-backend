import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { Cart, CartSchema } from "./schemas/cart.schema";
import { QuotesModule } from "../quotes/quotes.module";
import { DraftsModule } from "../drafts/drafts.module";
import { MaterialsModule } from "../materials/materials.module";
import { DiscountRulesModule } from "../discount-rules/discount-rules.module";
import { CustomersModule } from "../customers/customers.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    BullModule.registerQueue({
      name: "cart",
    }),
    QuotesModule, // Para validar precios si fuera necesario
    DraftsModule, // Para guardar grupos de borradores
    MaterialsModule, // Para hidratación de datos (BFF)
    DiscountRulesModule, // Para reglas de descuento globales
    CustomersModule, // Para validar clientes asignados
  ],

  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
