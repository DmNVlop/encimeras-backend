// src/materials/dto/delete-material.dto.ts

import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsMongoId } from "class-validator";

export class DeleteMaterialsDto {
    @IsArray()
    @ApiProperty({
        description: 'Arreglo de IDs de materiales a borrar',
        required: true,
    })
    @IsMongoId({ each: true })
    ids: string[];
}