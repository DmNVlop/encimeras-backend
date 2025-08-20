// src/materials/dto/create-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsArray, IsBoolean, IsOptional } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'El nombre único del material',
    example: 'Silestone Blanco Zeus',
  })
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
    description: 'El precio del material por metro cuadrado',
    example: 95.50,
  })
  @IsNumber()
  @IsNotEmpty()
  pricePerSquareMeter: number;

  @ApiProperty({
    description: 'Lista de grosores disponibles en cm',
    type: [Number],
    example: [2, 3],
  })
  @IsArray()
  @IsNotEmpty()
  thicknesses: number[];

  @ApiProperty({
    description: 'Lista de acabados disponibles para el material',
    type: [String],
    example: ['Pulido', 'Mate'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  finishes: string[];

  @ApiProperty({
    description: 'La categoría a la que pertenece el material',
    example: 'Cuarzo',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Indica si el material está activo y disponible para presupuestar',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
