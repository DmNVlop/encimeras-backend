import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";

export class TransferManagerDto {
  @ApiProperty({
    description: "ID del nuevo usuario MANAGER asignado",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  newManagerId: string;
}
