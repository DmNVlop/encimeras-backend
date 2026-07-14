import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from './schemas/material.schema';
import { ValidCombination, ValidCombinationSchema } from 'src/valid-combinations/schemas/valid-combination.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: ValidCombination.name, schema: ValidCombinationSchema },
    ]),
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService]
})
export class MaterialsModule { }
