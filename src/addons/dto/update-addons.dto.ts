import { PartialType } from '@nestjs/mapped-types';
import { CreateAddonDto } from './create-addons.dto';

export class UpdateAddonDto extends PartialType(CreateAddonDto) { }
