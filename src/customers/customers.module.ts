import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { Customer, CustomerSchema } from "./schemas/customer.schema";
import { User, UsersSchema } from "../users/schemas/users.schema";
import { FactorySettingsModule } from "../factory-settings/factory-settings.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UsersSchema },
    ]),
    FactorySettingsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
