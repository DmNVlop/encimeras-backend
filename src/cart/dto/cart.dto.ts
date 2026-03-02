import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CoreEntityDto } from "./core-entity.dto";

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  customName: string;

  /**
   * Datos estrictos para el motor de cálculo
   */
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoreEntityDto)
  core: CoreEntityDto;

  /**
   * Metadatos opacos para el backend, usados solo por el frontend para restaurar estado visual.
   */
  @IsObject()
  @IsOptional()
  uiState?: Record<string, any>;

  @IsString()
  @IsOptional()
  draftId?: string;
}

export class UpdateCartItemDto {
  @IsString()
  @IsOptional()
  customName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoreEntityDto)
  core?: CoreEntityDto;

  @IsObject()
  @IsOptional()
  uiState?: Record<string, any>;
}

export class RemoveItemsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}

export class ImportGroupDto {
  @IsOptional()
  @IsNotEmpty()
  clearFirst?: boolean;
}

export class AssignCustomerDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
