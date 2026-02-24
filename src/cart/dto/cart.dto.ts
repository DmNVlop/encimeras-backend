import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsObject } from "class-validator";

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  customName: string;

  @IsObject()
  @IsNotEmpty()
  configuration: {
    materials: any[];
    pieces: any[];
    addons: any[];
  };

  @IsNumber()
  @IsNotEmpty()
  subtotalPoints: number;

  @IsString()
  @IsOptional()
  draftId?: string;
}

export class UpdateCartItemDto {
  @IsString()
  @IsOptional()
  customName?: string;

  @IsObject()
  @IsOptional()
  configuration?: {
    materials: any[];
    pieces: any[];
    addons: any[];
  };

  @IsNumber()
  @IsOptional()
  subtotalPoints?: number;
}
