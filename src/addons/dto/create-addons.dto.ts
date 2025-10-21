import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateAddonDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(['COMBINATION_BASED', 'RANGE_BASED', 'FIXED'])
    pricingType: 'COMBINATION_BASED' | 'RANGE_BASED' | 'FIXED';

    @IsString()
    @IsNotEmpty()
    productTypeMap: string;

    // --- Campos Opcionales ---
    @IsOptional()
    @IsString()
    measurementRuleSetId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    inheritedAttributes?: string[];
}
