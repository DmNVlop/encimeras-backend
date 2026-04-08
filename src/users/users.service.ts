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

  async create(createUserDto: CreateUserDto, currentUserRoles: string[], currentUserFactoryId?: string): Promise<User> {
    const { username, password, roles, factoryId } = createUserDto;

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new this.userModel({
      ...createUserDto,
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
}
