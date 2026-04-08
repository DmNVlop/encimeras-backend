import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Create a new user (Admin or Owner)" })
  @ApiResponse({ status: 201, description: "User created successfully." })
  @ApiResponse({ status: 409, description: "User already exists." })
  create(@Body() createUserDto: CreateUserDto, @GetUser() user: any) {
    return this.usersService.create(createUserDto, user.roles, user.factoryId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Get all users (Admin or Owner by factory). Optional: ?role=SALES to filter" })
  @ApiResponse({ status: 200, description: "List of users obtained." })
  findAll(@Query("role") role?: string, @GetUser() user?: any) {
    if (user?.roles.includes(Role.OWNER) && user?.factoryId) {
      return this.usersService.findAllByFactory(user.factoryId);
    }
    return this.usersService.findAll(role);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.OWNER, Role.USER, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: "Get a user by ID (Admin, Owner or own user)" })
  @ApiResponse({ status: 200, description: "User found." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "User not found." })
  findOne(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    if (!user.roles.includes(Role.ADMIN) && !user.roles.includes(Role.OWNER) && user.userId !== id) {
      throw new ForbiddenException("You do not have permission to view this profile");
    }
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.OWNER, Role.USER, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: "Update a user (Admin, Owner or own user)" })
  @ApiResponse({ status: 200, description: "User updated." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "User not found." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto, @GetUser() user: any) {
    if (!user.roles.includes(Role.ADMIN) && !user.roles.includes(Role.OWNER) && user.userId !== id) {
      throw new ForbiddenException("You do not have permission to update this user");
    }

    if (!user.roles.includes(Role.ADMIN) && updateUserDto.roles) {
      delete updateUserDto.roles;
    }

    return this.usersService.update(id, updateUserDto, user.roles, user.factoryId);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete a user (Admin only)" })
  @ApiResponse({ status: 204, description: "User deleted." })
  @ApiResponse({ status: 404, description: "User not found." })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
