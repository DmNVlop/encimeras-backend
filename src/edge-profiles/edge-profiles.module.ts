import { Module } from '@nestjs/common';
import { EdgeProfilesService } from './edge-profiles.service';
import { EdgeProfilesController } from './edge-profiles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EdgeProfile, EdgeProfileSchema } from './schemas/edge-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EdgeProfile.name, schema: EdgeProfileSchema }]),
  ],
  controllers: [EdgeProfilesController],
  providers: [EdgeProfilesService],
})
export class EdgeProfilesModule { }
