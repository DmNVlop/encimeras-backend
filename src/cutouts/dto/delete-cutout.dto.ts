// src/cutouts/dto/delete-cutout.dto.ts

import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsMongoId } from "class-validator";

export class DeleteCutoutsDto {
    @IsArray()
    @ApiProperty({
        description: 'Arreglo de IDs de Cortes a borrar',
        required: true,
    })
    @IsMongoId({ each: true })
    ids: string[];
}