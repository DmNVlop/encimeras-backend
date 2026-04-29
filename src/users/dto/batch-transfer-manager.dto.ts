import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsMongoId } from "class-validator";

export class BatchTransferManagerDto {
  @ApiProperty({
    description: "IDs de los usuarios SALES a reasignar",
    example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  })
  @IsArray()
  @IsMongoId({ each: true })
  userIds: string[];

  @ApiProperty({
    description: "ID del nuevo MANAGER asignado",
    example: "507f1f77bcf86cd799439013",
  })
  @IsMongoId()
  newManagerId: string;
}
