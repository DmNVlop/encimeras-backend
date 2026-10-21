import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from "class-validator";
import { ORDER_STATUSES } from "../order-status-flow";

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...ORDER_STATUSES], {
    message: `El estado debe ser uno de los siguientes: ${ORDER_STATUSES.join(", ")}`,
  })
  status: string;

  // Obligatoria en REJECTED/CANCELLED (lo valida el servicio: depende del estado destino)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UndoOrderStatusDto {
  @IsString()
  @IsNotEmpty({ message: "La nota es obligatoria para deshacer un cambio de estado" })
  @MaxLength(1000)
  note: string;
}
