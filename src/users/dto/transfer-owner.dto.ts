import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";

export class TransferOwnerDto {
  @ApiProperty({
    description: "ID del nuevo usuario OWNER",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  newOwnerId: string;
}
