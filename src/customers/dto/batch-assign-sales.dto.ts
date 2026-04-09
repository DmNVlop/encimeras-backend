import { IsArray, IsNotEmpty, IsString, ArrayMinSize, IsMongoId } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BatchAssignUsersDto {
  @ApiProperty({ description: "Array of customer IDs to assign", example: ["cust1", "cust2"] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  customerIds: string[];

  @ApiProperty({ description: "Array of user IDs to assign", example: ["user1", "user2"] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  assignedUserIds: string[];
}
