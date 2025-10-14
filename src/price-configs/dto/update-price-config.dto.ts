import { PartialType } from '@nestjs/swagger';
import { CreatePriceConfigDto } from './create-price-config.dto';

export class UpdatePriceConfigDto extends PartialType(CreatePriceConfigDto) {}
