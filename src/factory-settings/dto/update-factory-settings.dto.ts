import { IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateFactorySettingsDto {
  @ApiPropertyOptional({ description: "URL del logo de la fábrica" })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({ description: "Nombre de archivo del logo (para gestión interna)" })
  @IsOptional()
  @IsString()
  logoFilename?: string | null;
}

export class UpdateAssignmentModeDto {
  @ApiPropertyOptional({ description: "true = varios usuarios asignados por cliente, false = solo uno" })
  @IsBoolean()
  multiAssignedUsersPerCustomer: boolean;
}
