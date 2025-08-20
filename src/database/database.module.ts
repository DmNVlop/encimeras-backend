// src/database/database.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const uri = configService.get<string>('MONGO_URI');

                // --- LÍNEA DE DEPURACIÓN ---
                // Esto nos mostrará en la consola qué valor tiene MONGO_URI.
                console.log(`Intentando conectar con MONGO_URI: ${uri}`);

                if (!uri) {
                    throw new Error('MONGO_URI no está definida en el archivo .env');
                }

                return {
                    uri: uri,
                    dbName: configService.get<string>('MONGO_DB_NAME'),
                };
            },
        }),
    ],
})
export class DatabaseModule { }
