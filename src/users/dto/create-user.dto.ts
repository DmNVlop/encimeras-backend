import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsArray, IsEnum, IsOptional, MinLength } from "class-validator";
import { Role } from "../../auth/enums/role.enum";

export class CreateUserDto {
  @ApiProperty({
    description: "Nombre de usuario para el login",
    example: "juan.perez",
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: "Contraseña del usuario (mínimo 6 caracteres)",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: "Roles asignados al usuario",
    enum: Role,
    isArray: true,
    example: [Role.USER],
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  roles?: Role[];

  @ApiPropertyOptional({
    description: "Nombre real del usuario",
    example: "Juan Pérez",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Correo electrónico de contacto",
    example: "juan@example.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: "Teléfono de contacto",
    example: "+34600000000",
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
