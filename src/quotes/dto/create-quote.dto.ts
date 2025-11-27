import { ApiProperty } from "@nestjs/swagger";
import { CalculateQuoteDto } from "./quote.dto";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

// src/quotes/dto/create-quote.dto.ts
export class CreateQuoteDto extends CalculateQuoteDto {
    @ApiProperty() @IsString() @IsNotEmpty() customerName: string;
    @ApiProperty() @IsString() @IsNotEmpty() customerEmail: string;
    @ApiProperty({ required: false }) @IsString() @IsOptional() customerPhone?: string;
}
