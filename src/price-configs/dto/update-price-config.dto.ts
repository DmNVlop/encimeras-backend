import { PartialType } from '@nestjs/swagger';
import { CreatePriceConfigDto } from './create-price-config.dto';

// Solo permitimos actualizar el precio, ya que cambiar la clave o el tipo
// rompería la lógica. Es mejor borrar y crear uno nuevo.
export class UpdatePriceConfigDto extends PartialType(CreatePriceConfigDto) {
    productType?: never; // No se puede actualizar
    combinationKey?: never; // No se puede actualizar
}