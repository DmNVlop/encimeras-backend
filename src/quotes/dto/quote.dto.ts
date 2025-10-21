// src/quotes/dto/quote.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator';
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
    @IsMongoId()
    materialId: string;

    // --- INICIO DE ATRIBUTOS DINÁMICOS ---
    @ApiProperty({ description: 'Tipo de material (ej. "Porcelánico")', example: 'Porcelánico' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        description: 'Objeto dinámico con los atributos de precio seleccionados',
        example: { MAT_GROUP: 'Basic', MAT_THICKNESS: '20mm', MAT_FACE: '1C' },
    })
    @IsObject()
    @IsNotEmpty()
    attributes: Record<string, string>;
    // --- FIN DE ATRIBUTOS DINÁMICOS ---

    @IsString()
    @IsNotEmpty()
    @IsEnum(['Lineal', 'L', 'U'])
    shape: 'Lineal' | 'L' | 'U';

    @IsObject()
    @ValidateNested()
    @Type(() => MeasurementsDto)
    measurements: MeasurementsDto;

    @IsString()
    @IsOptional()
    @IsMongoId()
    edgeProfileId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CutoutSelectionDto)
    @IsOptional()
    cutouts?: CutoutSelectionDto[];
}