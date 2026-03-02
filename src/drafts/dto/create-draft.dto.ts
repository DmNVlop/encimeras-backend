import { IsNotEmpty, IsNumber, IsOptional, IsEmail, IsObject, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CoreEntityDto } from "../../cart/dto/core-entity.dto";

export class CreateDraftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoreEntityDto)
  core: CoreEntityDto;

  @IsObject()
  @IsOptional()
  uiState?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  currentPricePoints?: number;

  @IsOptional()
  @IsNumber()
  originalPoints?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  cartGroupId?: string;
}
