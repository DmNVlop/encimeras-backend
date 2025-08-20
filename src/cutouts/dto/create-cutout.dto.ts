// src/cutouts/dto/create-cutout.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { CutoutType } from '../schemas/cutout.schema';
export class CreateCutoutDto {
    @IsString() @IsNotEmpty() name: string;
    @IsNumber() @IsNotEmpty() price: number;
    @IsEnum(CutoutType) @IsNotEmpty() type: CutoutType;
}