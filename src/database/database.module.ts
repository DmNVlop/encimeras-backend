// src/database/database.module.ts

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UsersSchema } from "../users/schemas/users.schema";
import { DocumentSettings, DocumentSettingsSchema } from "../document-settings/schemas/document-settings.schema";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>("MONGO_URI");

        // --- LÍNEA DE DEPURACIÓN ---
        // Esto nos mostrará en la consola qué valor tiene MONGO_URI.
        console.log(`Intentando conectar con MONGO_URI: ${uri}`);

        if (!uri) {
          throw new Error("MONGO_URI no está definida en el archivo .env");
        }

        return {
          uri: uri,
          dbName: configService.get<string>("MONGO_DB_NAME"),
        };
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UsersSchema },
      { name: DocumentSettings.name, schema: DocumentSettingsSchema },
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
