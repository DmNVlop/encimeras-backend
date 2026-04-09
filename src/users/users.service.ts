import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User } from "./schemas/users.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role } from "../auth/enums/role.enum";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto, currentUserRoles: string[], currentUserId: string, currentUserFactoryId?: string): Promise<User> {
    const { username, password, roles, factoryId, ownerId } = createUserDto;

    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new ConflictException(`El usuario "${username}" ya existe`);
    }

    const isOwner = currentUserRoles.includes(Role.OWNER) && !currentUserRoles.includes(Role.ADMIN);
    if (isOwner) {
      if (roles?.includes(Role.ADMIN) || roles?.includes(Role.OWNER)) {
        throw new ForbiddenException("OWNER cannot create ADMIN or OWNER users");
      }
      if (factoryId && factoryId !== currentUserFactoryId) {
        throw new ForbiddenException("OWNER can only create users in their own factory");
      }
    }

    let finalOwnerId = ownerId;
    if (roles?.includes(Role.SALES)) {
      if (currentUserRoles.includes(Role.ADMIN)) {
        if (!ownerId) {
          throw new ForbiddenException("ADMIN must specify ownerId when creating SALES user");
        }
        const ownerUser = await this.userModel.findById(ownerId).exec();
        if (!ownerUser || !ownerUser.roles.includes(Role.OWNER)) {
          throw new NotFoundException(`Owner with ID ${ownerId} not found or is not an OWNER`);
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
      ownerId: finalOwnerId,
      createdBy: currentUserId,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findAll(role?: string): Promise<User[]> {
    const query = role ? { roles: role } : {};
    return this.userModel.find(query).select("-password").exec();
  }

  async findAllByFactory(factoryId: string): Promise<User[]> {
    return this.userModel.find({ factoryId }).select("-password").exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select("-password").exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    // Este se usa para login, sí devolvemos el password
    return this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserRoles: string[], currentUserFactoryId?: string): Promise<User> {
    const targetUser = await this.userModel.findById(id).exec();
    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    const isOwner = currentUserRoles.includes(Role.OWNER) && !currentUserRoles.includes(Role.ADMIN);
    if (isOwner) {
      if (targetUser.factoryId && targetUser.factoryId !== currentUserFactoryId) {
        throw new ForbiddenException("OWNER can only update users in their own factory");
      }
      if (updateUserDto.roles?.includes(Role.ADMIN) || updateUserDto.roles?.includes(Role.OWNER)) {
        throw new ForbiddenException("OWNER cannot assign ADMIN or OWNER roles");
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

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
  }

  async findManagedUsers(ownerId: string): Promise<User[]> {
    const ownerUser = await this.userModel.findById(ownerId).exec();
    if (!ownerUser || !ownerUser.roles.includes(Role.OWNER)) {
      throw new NotFoundException(`Owner with ID ${ownerId} not found or is not an OWNER`);
    }

    return this.userModel.find({ ownerId, roles: Role.SALES }).select("-password").exec();
  }

  async transferOwnership(userId: string, newOwnerId: string, currentUserRoles: string[]): Promise<User> {
    if (!currentUserRoles.includes(Role.ADMIN)) {
      throw new ForbiddenException("Only ADMIN can transfer ownership");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.roles.includes(Role.SALES)) {
      throw new ForbiddenException("Only SALES users can be transferred between OWNERs");
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
    currentUserRoles: string[],
    currentUserId: string,
  ): Promise<{ transferred: number; failed: string[] }> {
    if (!currentUserRoles.includes(Role.ADMIN)) {
      throw new ForbiddenException("Only ADMIN can perform batch transfer");
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
        if (!user) {
          failed.push(`${userId}: User not found`);
          continue;
        }

        if (!user.roles.includes(Role.SALES)) {
          failed.push(`${userId}: Not a SALES user`);
          continue;
        }

        user.ownerId = newOwnerId;

        // Si no existe createdBy, asignarlo con el ID del usuario ADMIN actual
        if (!user.createdBy) {
          user.createdBy = currentUserId;
        }

        await user.save();
        transferred++;
      } catch (error) {
        failed.push(`${userId}: ${error.message}`);
      }
    }

    return { transferred, failed };
  }
}
