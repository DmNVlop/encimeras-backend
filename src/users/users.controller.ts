import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { TransferOwnerDto } from "./dto/transfer-owner.dto";
import { BatchTransferDto } from "./dto/batch-transfer.dto";
import { TransferManagerDto } from "./dto/transfer-manager.dto";
import { BatchTransferManagerDto } from "./dto/batch-transfer-manager.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { RoleHierarchyService } from "../auth/services/role-hierarchy.service";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roleHierarchy: RoleHierarchyService,
  ) {}

  @Post()
  @Roles(Role.MANAGER) // nivel 3 mínimo → ADMIN, OWNER, MANAGER pueden crear
  @ApiOperation({ summary: "Crear usuario (ADMIN, OWNER o MANAGER)" })
  @ApiResponse({ status: 201, description: "Usuario creado." })
  @ApiResponse({ status: 409, description: "Usuario ya existe." })
  create(@Body() createUserDto: CreateUserDto, @GetUser() user: any) {
    return this.usersService.create(createUserDto, user.roles, user.userId, user.factoryId);
  }

  @Get()
  @Roles(Role.USER) // Todos los roles autenticados pueden listar (el scope se filtra por rol)
  @ApiOperation({ summary: "Listar usuarios según rol. ADMIN=todos, OWNER=fábrica, MANAGER=sus SALES, SALES/WORKER/USER=solo su perfil" })
  @ApiResponse({ status: 200, description: "Lista de usuarios." })
  async findAll(@Query("role") role?: string, @Query("managed") managed?: string, @GetUser() user?: any) {
    const userRoles: Role[] = user?.roles ?? [];

    if (this.roleHierarchy.hasExactRole(userRoles, Role.OWNER) && user?.factoryId) {
      if (managed === "true") {
        return this.usersService.findManagedUsers(user.userId);
      }
      return this.usersService.findAllByFactory(user.factoryId, userRoles);
    }

    if (this.roleHierarchy.hasExactRole(userRoles, Role.MANAGER)) {
      return this.usersService.findManagedByManager(user.userId);
    }

    // SALES, WORKER, USER: solo su propio perfil
    if (!this.roleHierarchy.isAtLeast(userRoles, Role.MANAGER)) {
      const ownProfile = await this.usersService.findOne(user.userId);
      return [ownProfile];
    }

    return this.usersService.findAll(role);
  }

  @Get("managed")
  @Roles(Role.MANAGER) // OWNER y MANAGER pueden ver usuarios gestionados
  @ApiOperation({ summary: "Usuarios gestionados por el OWNER o MANAGER autenticado" })
  @ApiResponse({ status: 200, description: "Lista de usuarios gestionados." })
  findManaged(@GetUser() user: any) {
    const userRoles: Role[] = user.roles ?? [];
    if (this.roleHierarchy.hasExactRole(userRoles, Role.OWNER)) {
      return this.usersService.findManagedUsers(user.userId);
    }
    return this.usersService.findManagedByManager(user.userId);
  }

  @Get("managers")
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: "Lista de usuarios MANAGER disponibles en la fábrica" })
  @ApiResponse({ status: 200, description: "Lista de MANAGERs." })
  getManagers(@GetUser() user: any) {
    const userRoles: Role[] = user?.roles ?? [];
    const factoryId = this.roleHierarchy.isAtLeast(userRoles, Role.ADMIN) ? undefined : user.factoryId;
    return this.usersService.findManagerUsers(factoryId);
  }

  @Get(":id")
  @Roles(Role.USER) // cualquier usuario autenticado puede intentar, la lógica interna limita
  @ApiOperation({ summary: "Obtener usuario por ID (propio o con permisos)" })
  @ApiResponse({ status: 200, description: "Usuario encontrado." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  @ApiResponse({ status: 404, description: "No encontrado." })
  async findOne(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    const userRoles: Role[] = user.roles ?? [];

    if (this.roleHierarchy.isAtLeast(userRoles, Role.OWNER)) {
      return this.usersService.findOne(id);
    }

    if (this.roleHierarchy.hasExactRole(userRoles, Role.MANAGER)) {
      const managed = await this.usersService.findManagedByManager(user.userId);
      const isSelf = user.userId === id;
      const isChild = managed.some((u) => (u as any)._id.toString() === id);
      if (!isSelf && !isChild) {
        throw new ForbiddenException("No tienes permiso para ver este perfil");
      }
      return this.usersService.findOne(id);
    }

    if (user.userId !== id) {
      throw new ForbiddenException("No tienes permiso para ver este perfil");
    }
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.USER) // La lógica interna limita quién puede modificar a quién
  @ApiOperation({ summary: "Actualizar usuario (propio o con permisos)" })
  @ApiResponse({ status: 200, description: "Usuario actualizado." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  @ApiResponse({ status: 404, description: "No encontrado." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto, @GetUser() user: any) {
    const userRoles: Role[] = user.roles ?? [];
    const canEditOthers = this.roleHierarchy.isAtLeast(userRoles, Role.MANAGER);

    if (!canEditOthers && user.userId !== id) {
      throw new ForbiddenException("No tienes permiso para modificar este usuario");
    }

    // Usuarios sin permisos de gestión no pueden cambiar roles
    if (!this.roleHierarchy.isAtLeast(userRoles, Role.MANAGER)) {
      delete updateUserDto.roles;
    }

    return this.usersService.update(id, updateUserDto, userRoles, user.userId, user.factoryId);
  }

  @Delete("batch")
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: "Eliminar usuarios en lote (ADMIN/OWNER: cualquiera de su fábrica; MANAGER: solo sus SALES)" })
  @ApiResponse({ status: 200, description: "Resultado del borrado masivo." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  batchRemove(@Body() body: { userIds: string[] }, @GetUser() user: any) {
    return this.usersService.batchRemove(body.userIds, user.roles, user.userId, user.factoryId);
  }

  @Delete(":id")
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: "Eliminar usuario (ADMIN/OWNER: cualquiera; MANAGER: solo sus SALES)" })
  @ApiResponse({ status: 204, description: "Usuario eliminado." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  @ApiResponse({ status: 404, description: "No encontrado." })
  remove(@Param("id") id: string, @GetUser() user: any) {
    return this.usersService.remove(id, user.roles, user.userId, user.factoryId);
  }

  @Post(":id/transfer-owner")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Transferir SALES o MANAGER a otro OWNER (solo ADMIN)" })
  @ApiResponse({ status: 200, description: "Transferencia exitosa." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  @ApiResponse({ status: 404, description: "Usuario u owner no encontrado." })
  transferOwnership(@Param("id") id: string, @Body() transferDto: TransferOwnerDto, @GetUser() user: any) {
    return this.usersService.transferOwnership(id, transferDto.newOwnerId, user.roles);
  }

  @Post("batch-transfer")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Transferencia masiva de SALES/MANAGER a otro OWNER (solo ADMIN)" })
  @ApiResponse({ status: 200, description: "Transferencia masiva completada." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  batchTransferOwnership(@Body() batchTransferDto: BatchTransferDto, @GetUser() user: any) {
    return this.usersService.batchTransferOwnership(batchTransferDto.userIds, batchTransferDto.newOwnerId, user.roles, user.userId);
  }

  @Post(":id/transfer-manager")
  @Roles(Role.OWNER)
  @ApiOperation({ summary: "Asignar/cambiar MANAGER de un SALES (ADMIN u OWNER)" })
  @ApiResponse({ status: 200, description: "Manager asignado exitosamente." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  @ApiResponse({ status: 404, description: "Usuario o Manager no encontrado." })
  transferManager(@Param("id") id: string, @Body() transferDto: TransferManagerDto, @GetUser() user: any) {
    return this.usersService.transferManager(id, transferDto.newManagerId, user.roles);
  }

  @Post("batch-transfer-manager")
  @Roles(Role.OWNER)
  @ApiOperation({ summary: "Asignación masiva de MANAGER a usuarios SALES (ADMIN u OWNER)" })
  @ApiResponse({ status: 200, description: "Asignación masiva completada." })
  @ApiResponse({ status: 403, description: "Sin permisos." })
  batchTransferManager(@Body() batchTransferDto: BatchTransferManagerDto, @GetUser() user: any) {
    return this.usersService.batchTransferManager(batchTransferDto.userIds, batchTransferDto.newManagerId, user.roles, user.userId);
  }
}
