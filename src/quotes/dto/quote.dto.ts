// src/quotes/dto/quote.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class CutoutSelectionDto {
    @ApiProperty()
    @IsMongoId()
    cutoutId: string;

    @ApiProperty()
    @IsNumber()
    quantity: number;
}

export class CalculateQuoteDto {
    @ApiProperty() @IsMongoId() @IsNotEmpty() materialId: string;
    @ApiProperty() @IsNumber() @IsNotEmpty() thickness: number;
    @ApiProperty() @IsString() @IsNotEmpty() finish: string;
    @ApiProperty() @IsString() @IsNotEmpty() shape: 'Lineal' | 'L' | 'U';
    @ApiProperty() @IsObject() @IsNotEmpty() measurements: Record<string, number>;
    @ApiProperty() @IsMongoId() @IsNotEmpty() edgeProfileId: string;
    @ApiProperty({ type: [CutoutSelectionDto], required: false }) @IsArray() @ValidateNested({ each: true }) @Type(() => CutoutSelectionDto) @IsOptional() cutouts?: CutoutSelectionDto[];
    @ApiProperty({ required: false }) @IsNumber() @IsOptional() backsplashMeters?: number;
}


