import { IsEnum, IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsDateString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CollisionStrategy, CustomerStrategy, DiscountScope, DiscountType } from "../enums/discount-rule.enums";

class DiscountConditionsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CustomerStrategy)
  customerStrategy?: CustomerStrategy;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCustomers?: string[];

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;
}

export class CreateDiscountRuleDto {
  @IsString()
  name: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  value: number;

  @IsEnum(DiscountScope)
  scope: DiscountScope;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetMaterials?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCategories?: string[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsEnum(CollisionStrategy)
  collisionStrategy?: CollisionStrategy;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountConditionsDto)
  conditions?: DiscountConditionsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
