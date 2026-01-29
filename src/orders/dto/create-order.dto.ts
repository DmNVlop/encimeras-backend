import { IsString, IsNotEmpty, IsOptional, IsMongoId, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

// Datos mínimos para promover un borrador a orden
export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  draftId: string; // Obligatorio: la orden SIEMPRE nace de un borrador validado

  @IsString()
  @IsNotEmpty()
  customerId: string;

  // Información de contacto/envío adicional si no está en el perfil
  @IsOptional()
  deliveryInfo?: any;
}
