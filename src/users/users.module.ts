import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UsersSchema } from "./schemas/users.schema";
import { UsersService } from "src/auth/users.service";
import { SeedService } from "src/database/seed.service";

@Module({
  imports: [
    // 1. Aquí es donde se crea el "UserModel" que SeedService necesita
    MongooseModule.forFeature([{ name: User.name, schema: UsersSchema }]),
  ],
  providers: [
    UsersService,
    SeedService, // 2. Registramos el SeedService AQUÍ, donde tiene acceso al modelo
  ],
  exports: [UsersService], // No hace falta exportar SeedService si solo se ejecuta al inicio
})
export class UsersModule {}
