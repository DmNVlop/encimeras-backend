// src/quotes/dto/quote.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsObject, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

// 1. DTO para el Accesorio Aplicado (Dentro de una pieza)
class AppliedAddonDto {
  @ApiProperty({ description: "El código único del addon (ej. ENCASTRE_FREGADERO)" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "Medidas dinámicas necesarias (ancho, largo, etc.)" })
  @IsObject()
  @IsOptional()
  measurements?: Record<string, number>;

  // Nota: quantity puede venir dentro de measurements o fuera.
  // Lo ideal es manejarlo dentro de measurements para uniformidad,
  // pero lo dejamos aquí por compatibilidad si el front lo manda suelto.
  @IsNumber()
  @IsOptional()
  quantity?: number;
}

// 2. DTO para cada Pieza Principal
class MainPieceDto {
  @ApiProperty({ description: "ID temporal del frontend (opcional)", required: false })
  @IsOptional()
  id?: string;

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

// 3. DTO Principal de Cálculo
export class CalculateQuoteDto {
  @ApiProperty({ description: "Lista de piezas principales que componen el proyecto" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MainPieceDto)
  mainPieces: MainPieceDto[];
}
