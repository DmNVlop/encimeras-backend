// src/price-configs/dto/create-price-config.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreatePriceConfigDto {
    @IsString()
    @IsNotEmpty()
    productType: string;

    @IsString()
    @IsNotEmpty()
    combinationKey: string;

    @IsNumber()
    @IsPositive()
    price: number;
}
