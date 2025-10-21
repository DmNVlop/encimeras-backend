// src/valid-combinations/valid-combinations.module.ts
import { Module } from '@nestjs/common';
import { ValidCombinationsService } from './valid-combinations.service';
import { ValidCombinationsController } from './valid-combinations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ValidCombination, ValidCombinationSchema } from './schemas/valid-combination.schema';
import { Material, MaterialSchema } from 'src/materials/schemas/material.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ValidCombination.name, schema: ValidCombinationSchema }, { name: Material.name, schema: MaterialSchema }]),
  ],
  controllers: [ValidCombinationsController],
  providers: [ValidCombinationsService],
})
export class ValidCombinationsModule { }
