import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DictionariesController } from './dictionaries.controller';
import { DictionariesService } from './dictionaries.service';

// --- Importa los Schemas que el DictionariesService necesita ---
// (Ajusta las rutas si es necesario)
import { Addon, AddonSchema } from '../addons/schemas/addons.schema';
import { Material, MaterialSchema } from '../materials/schemas/material.schema';

@Module({
  imports: [
    // Definimos los modelos que este módulo puede inyectar.
    // El DictionariesService necesita Addon y Material para poder buscarlos.
    MongooseModule.forFeature([
      { name: Addon.name, schema: AddonSchema },
      { name: Material.name, schema: MaterialSchema }
    ])
  ],
  controllers: [DictionariesController],
  providers: [DictionariesService],
})
export class DictionariesModule { }