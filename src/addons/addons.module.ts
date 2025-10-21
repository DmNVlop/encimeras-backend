import { Module } from '@nestjs/common';
import { AddonsService } from './addons.service';
import { AddonsController } from './addons.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Addon, AddonSchema } from './schemas/addons.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Addon.name, schema: AddonSchema }]),
  ],
  providers: [AddonsService],
  controllers: [AddonsController],
  exports: [AddonsService],
})
export class AddonsModule { }
