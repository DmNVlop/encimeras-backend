// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'El nombre de usuario del administrador',
        example: 'admin',
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'La contraseña del administrador',
        example: 'admin123',
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}