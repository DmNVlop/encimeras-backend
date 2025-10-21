// =============================================================================
// 1. Crear el DTO para la actualización
// Archivo: src/valid-combinations/dto/update-valid-combination.dto.ts
// =============================================================================
import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateValidCombinationDto {
    @ApiProperty({
        description: 'Objeto clave-valor con la nueva combinación de atributos.',
        example: { MAT_THICKNESS: '40', MAT_FACE: '2C' },
    })
    @IsObject()
    @IsNotEmpty()
    attributes: Record<string, string>;
}