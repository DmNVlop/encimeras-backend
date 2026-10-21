import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UsersSchema } from "../../users/schemas/users.schema";
import { Customer, CustomerSchema } from "../../customers/schemas/customer.schema";
import { UsersModule } from "../../users/users.module";
import { DataScopeService } from "./data-scope.service";

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UsersSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  providers: [DataScopeService],
  exports: [DataScopeService],
})
export class DataScopeModule {}
