import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UsersSchema } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuthSharedModule } from "../auth/auth-shared.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UsersSchema }]),
    AuthSharedModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
