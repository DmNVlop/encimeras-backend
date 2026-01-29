import { IsNotEmpty, IsNumber, IsOptional, IsEmail, IsObject } from "class-validator";

export class CreateDraftDto {
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
