// src/valid-combinations/dto/create-valid-combination.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsObject, IsNotEmpty } from 'class-validator';

export class CreateValidCombinationDto {
    @ApiProperty({
        description: 'ID del material al que pertenece esta combinación válida.',
        example: '63f8b3b7b3b3b3b3b3b3b3b3',
    })
    @IsMongoId()
    @IsNotEmpty()
    materialId: string;

    @ApiProperty({
        description: 'Objeto clave-valor con la combinación de atributos válidos.',
        example: { MAT_THICKNESS: '20', MAT_FACE: '1C' },
    })
    @IsObject()
    @IsNotEmpty()
    attributes: Record<string, string>;
}