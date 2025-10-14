// src/attributes/dto/create-attribute.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateAttributeDto {
    @ApiProperty({
        description: 'El tipo o categoría del atributo (ej. GROUP, FACE, CUTOUT_TYPE)',
        example: 'GROUP, FACE, CUTOUT',
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        description: 'El valor del atributo (ej. Basic, 1C, SINK)',
        example: 'Basic, 1C, Chaflan',
    })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({
        description: 'Una etiqueta opcional y amigable para la UI (ej. "1 Cara")',
        example: '1 Cara',
        required: false,
    })
    @IsString()
    @IsOptional()
    label?: string;

    @ApiProperty({
        description: 'Indica si el atributo está activo y disponible para ser usado',
        example: true,
        default: true,
        required: false,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}