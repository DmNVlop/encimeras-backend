import { PartialType } from '@nestjs/mapped-types';
import { CreateCutoutDto } from './create-cutout.dto';

export class UpdateCutoutDto extends PartialType(CreateCutoutDto) {}
