// src/price-configs/dto/create-price-config.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsObject } from 'class-validator';

export class CreatePriceConfigDto {
    @ApiProperty({
        description: 'Objeto clave-valor con los atributos que definen el precio.',
        example: { mat_group: 'Basic', mat_face: '1C' },
    })
    @IsObject()
    @IsNotEmpty()
    attributes: Record<string, string>;

    @ApiProperty({ description: 'Precio por m² para esta combinación.' })
    @IsNumber()
    @IsNotEmpty()
    pricePerSquareMeter: number;
}