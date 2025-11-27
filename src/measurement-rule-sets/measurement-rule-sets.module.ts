import { Module } from '@nestjs/common';
import { MeasurementRuleSetsService } from './measurement-rule-sets.service';
import { MeasurementRuleSetsController } from './measurement-rule-sets.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MeasurementRuleSet, MeasurementRuleSetSchema } from './schemas/measurement-rule-sets.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MeasurementRuleSet.name, schema: MeasurementRuleSetSchema },
    ]),
  ],
  providers: [MeasurementRuleSetsService],
  controllers: [MeasurementRuleSetsController],
  exports: [MeasurementRuleSetsService]
})
export class MeasurementRuleSetsModule { }
