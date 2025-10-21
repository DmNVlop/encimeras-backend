import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsString,
    ValidateNested,
    IsOptional
} from 'class-validator';

// DTO para el subdocumento de rangos, usado para validación anidada.
class MeasurementRangeDto {
    @IsString()
    @IsNotEmpty()
    label: string;

    @IsNumber()
    min: number;

    @IsNumber()
    max: number;

    @IsEnum(['ml', 'm2', 'piece'])
    priceType: 'ml' | 'm2' | 'piece';
}

export class CreateMeasurementRuleSetDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MeasurementRangeDto)
    ranges: MeasurementRangeDto[];
}
