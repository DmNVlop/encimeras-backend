import { IsISO8601, IsOptional, IsString } from "class-validator";

/** Filtros de la actividad de presupuestos (embudo por usuario y por cliente). Sin fechas = todo el histórico. */
export class ActivityQueryDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  /** Solo lo respeta ADMIN; el resto ya queda limitado por su alcance. */
  @IsOptional()
  @IsString()
  factoryId?: string;
}
