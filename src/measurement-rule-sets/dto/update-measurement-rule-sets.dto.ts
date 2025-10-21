import { PartialType } from '@nestjs/mapped-types';
import { CreateMeasurementRuleSetDto } from './create-measurement-rule-sets.dto';

// PartialType hereda todas las validaciones de CreateDto pero las hace opcionales.
export class UpdateMeasurementRuleSetDto extends PartialType(
    CreateMeasurementRuleSetDto,
) { }
