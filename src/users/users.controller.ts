import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: "Crear un nuevo usuario (Solo Admin)" })
  @ApiResponse({ status: 201, description: "Usuario creado con éxito." })
  @ApiResponse({ status: 409, description: "El usuario ya existe." })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: "Obtener lista de todos los usuarios (Solo Admin)" })
  @ApiResponse({ status: 200, description: "Lista de usuarios obtenida." })
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(Role.ADMIN)
  @Get(":id")
  @ApiOperation({ summary: "Obtener un usuario por ID (Solo Admin)" })
  @ApiResponse({ status: 200, description: "Usuario encontrado." })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un usuario (Solo Admin)" })
  @ApiResponse({ status: 200, description: "Usuario actualizado." })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(":id")
  @ApiOperation({ summary: "Eliminar un usuario (Solo Admin)" })
  @ApiResponse({ status: 204, description: "Usuario eliminado." })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
