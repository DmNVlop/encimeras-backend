import { Module } from '@nestjs/common';
import { CutoutsService } from './cutouts.service';
import { CutoutsController } from './cutouts.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cutout, CutoutSchema } from './schemas/cutout.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cutout.name, schema: CutoutSchema }]),
  ],
  controllers: [CutoutsController],
  providers: [CutoutsService],
})
export class CutoutsModule { }
