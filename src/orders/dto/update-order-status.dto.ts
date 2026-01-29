import { IsString, IsNotEmpty, IsIn } from "class-validator";

// Lista de estados permitidos en tu flujo de fábrica
const ALLOWED_STATUSES = [
  "PENDING", // Recién llegada
  "REVIEWED", // Revisada por técnico
  "APPROVED", // Aprobada para fabricar (Lista para Ardis)
  "REJECTED", // Devuelta al cliente
  "MANUFACTURING", // En máquinas
  "SHIPPED", // Enviada
  "INSTALLED", // Terminada
  "CANCELLED", // Cancelada definitivamente
];

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_STATUSES, {
    message: `El estado debe ser uno de los siguientes: ${ALLOWED_STATUSES.join(", ")}`,
  })
  status: string;
}
