import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BatchAssignSalesDto {
  @ApiProperty({ description: "Array of customer IDs to assign", example: ["cust1", "cust2"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  customerIds: string[];

  @ApiProperty({ description: "Array of sales user IDs to assign", example: ["sales1", "sales2"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  salesUserIds: string[];
}
