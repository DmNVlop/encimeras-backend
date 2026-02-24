import { IsNotEmpty, IsNumber, IsOptional, IsEmail, IsObject, IsString } from "class-validator";

export class CreateDraftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsObject()
  @IsNotEmpty()
  configuration: {
    wizardTempMaterial: any;
    mainPieces: any[];
  };

  @IsNumber()
  @IsNotEmpty()
  currentPricePoints: number;
}
