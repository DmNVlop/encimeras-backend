import { PartialType } from '@nestjs/mapped-types';
import { CreateEdgeProfileDto } from './create-edge-profile.dto';

export class UpdateEdgeProfileDto extends PartialType(CreateEdgeProfileDto) {}
