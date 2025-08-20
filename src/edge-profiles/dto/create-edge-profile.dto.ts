// src/edge-profiles/dto/create-edge-profile.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
export class CreateEdgeProfileDto {
    @IsString() @IsNotEmpty() name: string;
    @IsNumber() @IsNotEmpty() pricePerMeter: number;
    @IsString() @IsOptional() imageUrl?: string;
}