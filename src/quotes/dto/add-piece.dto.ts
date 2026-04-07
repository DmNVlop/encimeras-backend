import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsObject, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber } from "class-validator";
import { Type } from "class-transformer";

class AppliedAddonDto {
  @ApiProperty({ description: "El código único del addon (ej. ENCASTRE_FREGADERO)" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "Medidas dinámicas necesarias (ancho, largo, etc.)" })
  @IsObject()
  @IsOptional()
  measurements?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  quantity?: number;
}

export class AddPieceDto {
  @ApiProperty({ description: "ID del Material seleccionado para esta pieza" })
  @IsMongoId()
  materialId: string;

  @ApiProperty({ description: "Atributos seleccionados (Color, Acabado...)" })
  @IsObject()
  selectedAttributes: Record<string, string>;

  @ApiProperty({ description: "Largo en mm" })
  @IsNumber()
  length_mm: number;

  @ApiProperty({ description: "Ancho en mm" })
  @IsNumber()
  width_mm: number;

  @ApiProperty({ description: "Lista de accesorios aplicados a esta pieza" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppliedAddonDto)
  @IsOptional()
  appliedAddons?: AppliedAddonDto[];
}
