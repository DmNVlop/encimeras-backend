// src/cutouts/dto/create-cutout.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateCutoutDto {
    @IsString() @IsNotEmpty() name: string;

    @IsNumber() @IsNotEmpty() price: number;

    @ApiProperty({ description: 'Tipo de corte (ej. SINK, HOB, OTHER)', example: 'SINK' })
    @IsString()
    @IsNotEmpty()
    type: string;
}