// src/materials/dto/create-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsArray, IsBoolean, IsOptional } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ example: 'MDF Hidrófugo', description: 'Nombre del material' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Una descripción detallada del material',
    required: false, // Indica que no es obligatorio
    example: 'Un cuarzo blanco puro de alta resistencia.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL de una imagen representativa del material',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: ['1C', '2C'],
    description: 'Caras disponibles para este material',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  faces: string[];

  @ApiProperty({
    example: ['Basic', 'Platinium'],
    description: 'Grupos de precio a los que pertenece este material',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  groups: string[];

  @ApiProperty({ example: [16, 19], description: 'Grosores disponibles en mm' })
  @IsArray()
  @IsNotEmpty()
  thicknesses: number[];

  @ApiProperty({ example: ['Seda', 'Brillo'], description: 'Acabados disponibles' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  finishes: string[];

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
}
