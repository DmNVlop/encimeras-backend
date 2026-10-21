import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ORDER_STATUSES } from "../order-status-flow";

export const ORDER_SEARCH_MAX_LIMIT = 100;

/** Bandeja de órdenes (`GET /orders/search`): paginada en servidor, filtrable por estados y texto libre. */
export class OrderSearchQueryDto {
  /** Uno o varios estados separados por coma (p. ej. `INSTALLED,REJECTED,CANCELLED`). Vacío = todos. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.split(",").map((s) => s.trim()).filter(Boolean) : value))
  @IsIn([...ORDER_STATUSES], { each: true, message: `Estados válidos: ${ORDER_STATUSES.join(", ")}` })
  status?: string[];

  /** Nº de orden, nombre, cliente o vendedor. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Página empezando en 0. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORDER_SEARCH_MAX_LIMIT)
  limit?: number = 25;
}
