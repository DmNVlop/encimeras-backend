import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UsersSchema } from "../../users/schemas/users.schema";
import { Customer, CustomerSchema } from "../../customers/schemas/customer.schema";
import { DisplayNamesService } from "./display-names.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UsersSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  providers: [DisplayNamesService],
  exports: [DisplayNamesService],
})
export class DisplayNamesModule {}
