import { IsArray, IsString, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BatchDeleteCustomersDto {
  @ApiProperty({ description: "Array of customer IDs to deactivate", example: ["cust1", "cust2"] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  customerIds: string[];
}
