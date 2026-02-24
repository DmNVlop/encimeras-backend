import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsObject } from "class-validator";

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  customName: string;

  @IsObject()
  @IsNotEmpty()
  configuration: {
    wizardTempMaterial?: any;
    selectedShapeId?: string;
    mainPieces: any[];
    materials?: any[];
    addons?: any[];
    [key: string]: any; // Allow for extensibility
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
    wizardTempMaterial?: any;
    selectedShapeId?: string;
    mainPieces?: any[];
    materials?: any[];
    addons?: any[];
    [key: string]: any;
  };

  @IsNumber()
  @IsOptional()
  subtotalPoints?: number;
}

export class RemoveItemsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}

export class ImportGroupDto {
  @IsOptional()
  @IsNotEmpty()
  clearFirst?: boolean;
}
