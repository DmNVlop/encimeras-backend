import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateDocumentSettingsDto {
  @IsNumber()
  @Min(1)
  validityDays: number;

  @IsString()
  footerText: string;

  @IsOptional()
  @IsString()
  userId?: string | null;
}
