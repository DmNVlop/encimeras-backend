import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User } from "./schemas/users.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role, ROLE_HIERARCHY, getMaxRoleLevel } from "../auth/enums/role.enum";
import { RoleHierarchyService } from "../auth/services/role-hierarchy.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly roleHierarchy: RoleHierarchyService,
  ) {}

  async create(createUserDto: CreateUserDto, currentUserRoles: Role[], currentUserId: string, currentUserFactoryId?: string): Promise<User> {
    const { username, password, roles = [Role.USER], factoryId, ownerId } = createUserDto;

    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new ConflictException(`El usuario "${username}" ya existe`);
    }

    // El creador solo puede asignar roles de nivel inferior al suyo
    if (!this.roleHierarchy.canAssignRoles(currentUserRoles, roles)) {
      throw new ForbiddenException("No puedes asignar roles iguales o superiores al tuyo");
    }

    // Usuarios con scope de fábrica solo pueden crear usuarios en su propia fábrica
    const isFactoryScoped = !currentUserRoles.includes(Role.ADMIN);
    if (isFactoryScoped) {
      if (factoryId && factoryId !== currentUserFactoryId) {
        throw new ForbiddenException("Solo puedes crear usuarios en tu propia fábrica");
      }
    }

    // Resolución de ownerId y managerId para usuarios SALES
    let finalOwnerId = ownerId;
    let finalManagerId = createUserDto.managerId;

    if (roles.includes(Role.SALES)) {
      if (currentUserRoles.includes(Role.ADMIN)) {
        // ADMIN debe especificar managerId
        if (!finalManagerId) {
          throw new ForbiddenException("ADMIN debe especificar managerId al crear usuario SALES");
        }
        const managerUser = await this.userModel.findById(finalManagerId).exec();
        if (!managerUser || !managerUser.roles.includes(Role.MANAGER)) {
          throw new NotFoundException(`Manager con ID ${finalManagerId} no encontrado o no es MANAGER`);
        }
        // Hereda el ownerId del MANAGER
        finalOwnerId = managerUser.ownerId ?? ownerId;
      } else if (currentUserRoles.includes(Role.OWNER)) {
        // OWNER debe especificar managerId
        if (!finalManagerId) {
          throw new ForbiddenException("OWNER debe especificar managerId al crear usuario SALES");
        }
        const managerUser = await this.userModel.findById(finalManagerId).exec();
        if (!managerUser || !managerUser.roles.includes(Role.MANAGER)) {
          throw new NotFoundException(`Manager con ID ${finalManagerId} no encontrado o no es MANAGER`);
        }
        finalOwnerId = currentUserId;
      } else if (currentUserRoles.includes(Role.MANAGER)) {
        // MANAGER creando SALES: se auto-asigna como manager
        const managerUser = await this.userModel.findById(currentUserId).exec();
        finalManagerId = currentUserId;
        finalOwnerId = managerUser?.ownerId ?? undefined;
      }
    } else if (roles.includes(Role.MANAGER)) {
      if (currentUserRoles.includes(Role.ADMIN)) {
        if (!ownerId) {
          throw new ForbiddenException("ADMIN debe especificar ownerId al crear usuario MANAGER");
        }
        const ownerUser = await this.userModel.findById(ownerId).exec();
        if (!ownerUser || !ownerUser.roles.includes(Role.OWNER)) {
          throw new NotFoundException(`Owner con ID ${ownerId} no encontrado o no es OWNER`);
        }
        finalOwnerId = ownerId;
      } else if (currentUserRoles.includes(Role.OWNER)) {
        finalOwnerId = currentUserId;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new this.userModel({
      ...createUserDto,
      roles,
      factoryId: isFactoryScoped ? (factoryId ?? currentUserFactoryId) : factoryId,
      ownerId: finalOwnerId,
      managerId: finalManagerId,
      createdBy: currentUserId,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findAll(role?: string): Promise<User[]> {
    const query = role ? { roles: role } : {};
    return this.userModel.find(query).select("-password").exec();
  }

  async findAllByFactory(factoryId: string, callerRoles: Role[]): Promise<User[]> {
    if (!callerRoles || callerRoles.length === 0) return [];

    const callerLevel = getMaxRoleLevel(callerRoles);
    const visibleRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level < callerLevel)
      .map(([role]) => role as Role);

    if (visibleRoles.length === 0) return [];

    return this.userModel.find({ factoryId, roles: { $in: visibleRoles } }).select("-password").exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select("-password").exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserRoles: Role[], currentUserId: string, currentUserFactoryId?: string): Promise<User> {
    const targetUser = await this.userModel.findById(id).exec();
    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    // Scope de fábrica: OWNER y MANAGER solo modifican usuarios de su fábrica
    const isFactoryScoped = !currentUserRoles.includes(Role.ADMIN);
    if (isFactoryScoped) {
      if (targetUser.factoryId && targetUser.factoryId.toString() !== currentUserFactoryId) {
        throw new ForbiddenException("Solo puedes modificar usuarios de tu propia fábrica");
      }
    }

    // Control de asignación de roles: solo roles inferiores al propio
    if (updateUserDto.roles) {
      if (!this.roleHierarchy.canAssignRoles(currentUserRoles, updateUserDto.roles)) {
        throw new ForbiddenException("No puedes asignar roles iguales o superiores al tuyo");
      }
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).select("-password").exec();

    if (!updatedUser) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    return updatedUser;
  }

  async remove(id: string, callerRoles: Role[], callerId: string, callerFactoryId?: string): Promise<void> {
    const target = await this.userModel.findById(id).exec();
    if (!target) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    const isAdmin = callerRoles.includes(Role.ADMIN);
    const isOwner = callerRoles.includes(Role.OWNER);
    const isManager = callerRoles.includes(Role.MANAGER);

    if (isAdmin) {
      // sin restricciones
    } else if (isOwner) {
      // solo usuarios de su fábrica
      if (target.factoryId?.toString() !== callerFactoryId) {
        throw new ForbiddenException("Solo puedes eliminar usuarios de tu propia fábrica");
      }
    } else if (isManager) {
      // solo sus SALES directos
      if (!target.roles.includes(Role.SALES) || target.managerId?.toString() !== callerId) {
        throw new ForbiddenException("Solo puedes eliminar usuarios SALES que gestionas directamente");
      }
    } else {
      throw new ForbiddenException("No tienes permisos para eliminar usuarios");
    }

    await this.userModel.findByIdAndDelete(id).exec();
  }

  /** OWNER ve los SALES y MANAGER que gestiona directamente. */
  async findManagedUsers(ownerId: string): Promise<User[]> {
    const ownerUser = await this.userModel.findById(ownerId).exec();
    if (!ownerUser || !ownerUser.roles.includes(Role.OWNER)) {
      throw new NotFoundException(`Owner con ID ${ownerId} no encontrado o no es OWNER`);
    }

    return this.userModel
      .find({ ownerId, roles: { $in: [Role.SALES, Role.MANAGER] } })
      .select("-password")
      .exec();
  }

  /** MANAGER ve los SALES que gestiona por managerId. */
  async findManagedByManager(managerId: string): Promise<User[]> {
    return this.userModel
      .find({ managerId, roles: Role.SALES })
      .select("-password")
      .exec();
  }

  async transferOwnership(userId: string, newOwnerId: string, currentUserRoles: Role[]): Promise<User> {
    if (!currentUserRoles.includes(Role.ADMIN)) {
      throw new ForbiddenException("Solo ADMIN puede transferir ownership");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const transferableRoles = [Role.SALES, Role.MANAGER];
    if (!transferableRoles.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException("Solo usuarios SALES o MANAGER pueden transferirse entre OWNERs");
    }

    const newOwner = await this.userModel.findById(newOwnerId).exec();
    if (!newOwner || !newOwner.roles.includes(Role.OWNER)) {
      throw new NotFoundException(`New owner with ID ${newOwnerId} not found or is not an OWNER`);
    }

    user.ownerId = newOwnerId;
    return user.save();
  }

  async batchTransferOwnership(
    userIds: string[],
    newOwnerId: string,
    currentUserRoles: Role[],
    currentUserId: string,
  ): Promise<{ transferred: number; failed: string[] }> {
    if (!currentUserRoles.includes(Role.ADMIN)) {
      throw new ForbiddenException("Solo ADMIN puede hacer transferencia masiva de owner");
    }

    const newOwner = await this.userModel.findById(newOwnerId).exec();
    if (!newOwner || !newOwner.roles.includes(Role.OWNER)) {
      throw new NotFoundException(`New owner with ID ${newOwnerId} not found or is not an OWNER`);
    }

    const failed: string[] = [];
    let transferred = 0;

    for (const userId of userIds) {
      try {
        const user = await this.userModel.findById(userId).exec();
        if (!user) { failed.push(`${userId}: User not found`); continue; }
        if (!user.roles.includes(Role.SALES) && !user.roles.includes(Role.MANAGER)) {
          failed.push(`${userId}: Not a SALES or MANAGER user`); continue;
        }
        user.ownerId = newOwnerId;
        if (!user.createdBy) user.createdBy = currentUserId;
        await user.save();
        transferred++;
      } catch (error) {
        failed.push(`${userId}: ${error.message}`);
      }
    }

    return { transferred, failed };
  }

  /** Asigna/cambia el MANAGER de usuarios SALES. Permitido para ADMIN y OWNER. */
  async transferManager(userId: string, newManagerId: string, currentUserRoles: Role[]): Promise<User> {
    const canTransfer = currentUserRoles.includes(Role.ADMIN) || currentUserRoles.includes(Role.OWNER);
    if (!canTransfer) {
      throw new ForbiddenException("Solo ADMIN u OWNER pueden cambiar el Manager asignado");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    if (!user.roles.includes(Role.SALES)) {
      throw new ForbiddenException("Solo usuarios SALES pueden tener Manager asignado");
    }

    const newManager = await this.userModel.findById(newManagerId).exec();
    if (!newManager || !newManager.roles.includes(Role.MANAGER)) {
      throw new NotFoundException(`Manager con ID ${newManagerId} no encontrado o no es MANAGER`);
    }

    user.managerId = newManagerId;
    // Actualizar ownerId al del MANAGER si aplica
    if (newManager.ownerId) user.ownerId = newManager.ownerId;
    return user.save();
  }

  /** Asignación masiva de MANAGER a usuarios SALES. Permitido para ADMIN y OWNER. */
  async batchTransferManager(
    userIds: string[],
    newManagerId: string,
    currentUserRoles: Role[],
    currentUserId: string,
  ): Promise<{ transferred: number; failed: string[] }> {
    const canTransfer = currentUserRoles.includes(Role.ADMIN) || currentUserRoles.includes(Role.OWNER);
    if (!canTransfer) {
      throw new ForbiddenException("Solo ADMIN u OWNER pueden hacer asignación masiva de Manager");
    }

    const newManager = await this.userModel.findById(newManagerId).exec();
    if (!newManager || !newManager.roles.includes(Role.MANAGER)) {
      throw new NotFoundException(`Manager con ID ${newManagerId} no encontrado o no es MANAGER`);
    }

    const failed: string[] = [];
    let transferred = 0;

    for (const userId of userIds) {
      try {
        const user = await this.userModel.findById(userId).exec();
        if (!user) { failed.push(`${userId}: User not found`); continue; }
        if (!user.roles.includes(Role.SALES)) {
          failed.push(`${userId}: Not a SALES user`); continue;
        }
        user.managerId = newManagerId;
        if (newManager.ownerId) user.ownerId = newManager.ownerId;
        if (!user.createdBy) user.createdBy = currentUserId;
        await user.save();
        transferred++;
      } catch (error) {
        failed.push(`${userId}: ${error.message}`);
      }
    }

    return { transferred, failed };
  }

  async batchRemove(
    userIds: string[],
    callerRoles: Role[],
    callerId: string,
    callerFactoryId?: string,
  ): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;

    for (const id of userIds) {
      try {
        await this.remove(id, callerRoles, callerId, callerFactoryId);
        deleted++;
      } catch (err) {
        failed.push(`${id}: ${err.message}`);
      }
    }

    return { deleted, failed };
  }

  /** Lista los MANAGERs disponibles en una fábrica. */
  async findManagerUsers(factoryId?: string): Promise<User[]> {
    const query: any = { roles: Role.MANAGER };
    if (factoryId) query.factoryId = factoryId;
    return this.userModel.find(query).select("-password").exec();
  }
}
