import { Type } from 'class-transformer';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

// DTO para el subdocumento, para validación anidada
class AppliedAddonDto {
    @IsString()
    @IsNotEmpty()
    addonCode: string;

    @IsObject()
    @IsOptional()
    measurements?: Record<string, number>;

    @IsNumber()
    @IsOptional()
    quantity?: number;
}

export class CreateMainPieceDto {
    @IsString()
    @IsOptional() // El quoteId se asignará en el servicio de Quotes
    quoteId?: string;

    @IsString()
    @IsNotEmpty()
    materialId: string;

    @IsObject()
    selectedAttributes: Record<string, string>;

    @IsNumber()
    length_mm: number;

    @IsNumber()
    width_mm: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AppliedAddonDto)
    @IsOptional()
    appliedAddons?: AppliedAddonDto[];
}
