import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { MainPieceDto } from "../../quotes/dto/quote.dto";

/**
 * Representa el contrato estricto de negocio para una configuración.
 * El motor de cálculo solo consume este objeto.
 */
export class CoreEntityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MainPieceDto)
  @IsNotEmpty()
  mainPieces: MainPieceDto[];

  @IsOptional()
  @IsString()
  factoryId?: string;
}
