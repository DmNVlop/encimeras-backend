import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateAddonDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // --- NUEVOS CAMPOS VALIDADOS ---
  @IsEnum(["TRABAJO", "ENSAMBLAJE", "COMPLEMENTO", "OTRO"])
  @IsNotEmpty()
  category: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  allowedMaterialCategories: string[];

  @IsArray()
  @IsEnum(["quantity", "length_ml", "width_mm", "height_mm", "radio_mm"], { each: true })
  @IsNotEmpty()
  requiredMeasurements: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // --- CAMPOS EXISTENTES ---
  @IsEnum(["COMBINATION_BASED", "RANGE_BASED", "FIXED"])
  pricingType: "COMBINATION_BASED" | "RANGE_BASED" | "FIXED";

  @IsString()
  @IsNotEmpty()
  productTypeMap: string;

  @IsOptional()
  @IsString()
  measurementRuleSetId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inheritedAttributes?: string[];
}
