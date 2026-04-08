import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { BatchAssignUsersDto } from "./dto/batch-assign-sales.dto";
import { BatchDeleteCustomersDto } from "./dto/batch-delete-customers.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Create a new customer" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createCustomerDto: CreateCustomerDto, @GetUser("factoryId") factoryId: string, @GetUser("userId") userId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.create(createCustomerDto, factoryId, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
  @ApiOperation({ summary: "List all active customers (filtered by role)" })
  findAll(@GetUser() user: any) {
    const { factoryId, userId, roles } = user;
    if (!factoryId) throw new Error("Factory ID is required");

    if (roles.includes(Role.ADMIN)) {
      return this.customersService.findAll(factoryId);
    }
    if (roles.includes(Role.OWNER)) {
      return this.customersService.findAllForOwner(factoryId);
    }
    return this.customersService.findAllForSales(factoryId, userId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
  @ApiOperation({ summary: "Get customer details (access controlled by role)" })
  findOne(@Param("id") id: string, @GetUser() user: any) {
    const { factoryId, userId, roles } = user;
    if (!factoryId) throw new Error("Factory ID is required");

    if (roles.includes(Role.ADMIN)) {
      return this.customersService.findOne(id, factoryId);
    }
    if (roles.includes(Role.OWNER)) {
      return this.customersService.findOneForOwner(id, factoryId);
    }
    return this.customersService.findOneForSales(id, factoryId, userId);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
  @ApiOperation({ summary: "Update customer information (Admin, Owner & Sales)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param("id") id: string, @Body() updateCustomerDto: UpdateCustomerDto, @GetUser() user: any) {
    if (!user.factoryId) throw new Error("Factory ID is required");
    return this.customersService.update(id, updateCustomerDto, user.factoryId, user.userId, user.roles);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Deactivate a customer (Soft Delete)" })
  remove(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.remove(id, factoryId);
  }

  @Post(":id/link/:userId")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Link customer to a platform user" })
  linkToUser(@Param("id") id: string, @Param("userId") userId: string, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.linkToUser(id, userId, factoryId);
  }

  @Patch("batch/assign-users")
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Assign users to multiple customers in batch" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  batchAssignUsers(@Body() dto: BatchAssignUsersDto, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.batchAssignSales(dto, factoryId);
  }

  @Delete("batch")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Deactivate multiple customers in batch (Soft Delete)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  batchRemove(@Body() dto: BatchDeleteCustomersDto, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.batchRemove(dto.customerIds, factoryId);
  }
}
