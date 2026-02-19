import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException } from "@nestjs/common";
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

  @Roles(Role.ADMIN, Role.USER, Role.SALES, Role.WORKER)
  @Get(":id")
  @ApiOperation({ summary: "Obtener un usuario por ID (Admin o propio usuario)" })
  @ApiResponse({ status: 200, description: "Usuario encontrado." })
  @ApiResponse({ status: 403, description: "Prohibido (cuando no es admin ni es el propio usuario)." })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  findOne(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    if (!user.roles.includes(Role.ADMIN) && user.userId !== id) {
      throw new ForbiddenException("No tienes permiso para ver este perfil");
    }
    return this.usersService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.USER, Role.SALES, Role.WORKER)
  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un usuario (Admin o propio usuario)" })
  @ApiResponse({ status: 200, description: "Usuario actualizado." })
  @ApiResponse({ status: 403, description: "Prohibido (cuando no es admin ni es el propio usuario)." })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    const user = req.user;

    // Si no es ADMIN, solo puede actualizarse a sí mismo
    if (!user.roles.includes(Role.ADMIN) && user.userId !== id) {
      throw new ForbiddenException("No tienes permiso para actualizar este usuario");
    }

    // Si no es ADMIN, no permitimos que cambie sus propios roles
    if (!user.roles.includes(Role.ADMIN) && updateUserDto.roles) {
      delete updateUserDto.roles;
    }

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
