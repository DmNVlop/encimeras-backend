import { IsEnum, IsString, IsOptional, IsBoolean, IsEmail, IsUrl, IsArray, IsDateString, IsNumber, ValidateNested, ValidateIf } from "class-validator";
import { Type } from "class-transformer";
import { CustomerType } from "../enums/customer-type.enum";

class ContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  socialMedia?: string[];
}

class AddressDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  cp?: string;
}

export class CreateCustomerDto {
  @IsEnum(CustomerType)
  type: CustomerType;

  @IsOptional()
  @IsString()
  officialName?: string;

  @ValidateIf((o) => o.type === CustomerType.INDIVIDUAL)
  @IsString()
  firstName?: string;

  @ValidateIf((o) => o.type === CustomerType.INDIVIDUAL)
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  commercialName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  legalRepresentative?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  platformUserId?: string;

  @IsOptional()
  @IsNumber()
  discountProfile?: number;

  @IsOptional()
  @IsNumber()
  taxProfile?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedSalesUserIds?: string[];
}
