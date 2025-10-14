// src/quotes/dto/quote.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ====================================================================
// DEFINICIÓN DE LA CLASE Measurements
// ====================================================================
class MeasurementsDto {
    @ApiProperty({ example: 620, description: 'Fondo de la encimera en mm' })
    @IsNumber()
    fondo: number;

    @ApiProperty({ example: 2500, description: 'Medida del lado A (o largo) en mm' })
    @IsNumber()
    ladoA: number;

    @ApiProperty({ required: false, example: 1800, description: 'Medida del lado B en mm (para formas L y U)' })
    @IsOptional()
    @IsNumber()
    ladoB?: number;

    @ApiProperty({ required: false, example: 1200, description: 'Medida del lado C en mm (para forma U)' })
    @IsOptional()
    @IsNumber()
    ladoC?: number;

    @ApiProperty({ required: false, example: 4.3, description: 'Metros lineales de copete' })
    @IsOptional()
    @IsNumber()
    copete?: number;
}

// ====================================================================
// DEFINICIÓN DE LA CLASE CutoutSelection
// ====================================================================
class CutoutSelectionDto {
    @ApiProperty({ description: 'ID del corte seleccionado' })
    @IsMongoId()
    cutoutId: string;

    @ApiProperty({ example: 1, description: 'Cantidad de este tipo de corte' })
    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CalculateQuoteDto {
    @IsString()
    @IsNotEmpty()
    materialId: string;

    // --- ATRIBUTOS DINÁMICOS PARA EL PRECIO ---
    @IsString()
    @IsNotEmpty()
    thickness: string;

    @IsString()
    @IsNotEmpty()
    finish: string;

    @IsString()
    @IsNotEmpty()
    group: string;

    @IsString()
    @IsNotEmpty()
    face: string;

    @IsString()
    @IsNotEmpty()
    type: string;
    // --- FIN DE ATRIBUTOS ---

    @IsString()
    @IsNotEmpty()
    shape: 'Lineal' | 'L' | 'U';

    @IsObject()
    @ValidateNested()
    @Type(() => MeasurementsDto)
    measurements: MeasurementsDto;

    @IsString()
    @IsOptional()
    edgeProfileId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CutoutSelectionDto)
    @IsOptional()
    cutouts?: CutoutSelectionDto[];
}


