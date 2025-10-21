// src/materials/dto/create-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsArray, IsBoolean, IsOptional, IsEnum, ValidateNested } from 'class-validator';

class PricingRecipeDto {
  @IsString()
  @IsNotEmpty()
  productType: string;

  @IsArray()
  @IsString({ each: true })
  pricingAttributes: string[];

  @IsEnum(['m2', 'ml'])
  unit: 'm2' | 'ml';
}

export class CreateMaterialDto {
  @ApiProperty({ example: 'MDF Hidrófugo', description: 'Nombre del material' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Una descripción detallada del material',
    required: false,
    example: 'Un cuarzo blanco puro de alta resistencia.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Una referencia del material',
    required: false,
    example: '8364',
  })
  @IsString()
  @IsOptional()
  ref?: string;

  @ApiProperty({
    description: 'URL de una imagen representativa del material',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Melaminas, Crudo, Fenix', description: 'Categoría del material' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'DM, HPL, Compacto', description: 'Tipo del material' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Array con los tipos de atributos que definen el precio (ej. MAT_GROUP, MAT_FACE)',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingRecipeDto)
  pricingRecipes: PricingRecipeDto[];

  @IsArray() // <-- Para el Step1
  @IsString({ each: true })
  @IsOptional()
  selectableAttributes?: string[];
}
