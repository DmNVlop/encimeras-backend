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
  @Roles(Role.SALES) // nivel 2 mínimo → MANAGER, OWNER y ADMIN también
  @ApiOperation({ summary: "Create a new customer" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createCustomerDto: CreateCustomerDto, @GetUser() user: any) {
    if (!user.factoryId) throw new Error("Factory ID is required");
    return this.customersService.create(createCustomerDto, user.factoryId, user.userId, user.roles);
  }

  @Get()
  @Roles(Role.USER) // nivel 0 — la lógica interna filtra por rol
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
    if (roles.includes(Role.MANAGER)) {
      return this.customersService.findAllForManager(factoryId, userId);
    }
    if (roles.includes(Role.WORKER)) {
      return this.customersService.findAll(factoryId);
    }
    if (roles.includes(Role.SALES)) {
      return this.customersService.findAllForSales(factoryId, userId);
    }
    return this.customersService.findAllForUser(factoryId, userId);
  }

  @Get(":id")
  @Roles(Role.USER) // nivel 0 — lógica interna filtra
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
    if (roles.includes(Role.MANAGER)) {
      return this.customersService.findOneForManager(id, factoryId, userId);
    }
    if (roles.includes(Role.WORKER)) {
      return this.customersService.findOne(id, factoryId);
    }
    if (roles.includes(Role.SALES)) {
      return this.customersService.findOneForSales(id, factoryId, userId);
    }
    return this.customersService.findOneForUser(id, factoryId, userId);
  }

  @Patch(":id")
  @Roles(Role.SALES) // nivel 2 mínimo → MANAGER, OWNER y ADMIN también
  @ApiOperation({ summary: "Update customer information (Admin, Manager & Sales)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param("id") id: string, @Body() updateCustomerDto: UpdateCustomerDto, @GetUser() user: any) {
    if (!user.factoryId) throw new Error("Factory ID is required");
    return this.customersService.update(id, updateCustomerDto, user.factoryId, user.userId, user.roles);
  }

  @Post(":id/link/:userId")
  @Roles(Role.MANAGER) // nivel 3 mínimo → MANAGER, OWNER y ADMIN
  @ApiOperation({ summary: "Link customer to a platform user" })
  linkToUser(@Param("id") id: string, @Param("userId") userId: string, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.linkToUser(id, userId, factoryId);
  }

  @Patch("batch/assign-users")
  @Roles(Role.MANAGER) // nivel 3 mínimo
  @ApiOperation({ summary: "Assign users to multiple customers in batch" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  batchAssignUsers(@Body() dto: BatchAssignUsersDto, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.batchAssignSales(dto, factoryId);
  }

  // IMPORTANTE: @Delete("batch") debe declararse ANTES que @Delete(":id") — Nest matchea
  // rutas en orden de declaración, así que si ":id" va primero, "DELETE /customers/batch"
  // matchea ahí con id="batch" y Mongoose tira CastError al castear "batch" a ObjectId
  // (bug real detectado 2026-07-14: toda la UI de borrado individual/batch de Customers
  // devolvía 500 por este orden).
  @Delete("batch")
  @Roles(Role.MANAGER) // nivel 3 mínimo
  @ApiOperation({ summary: "Deactivate multiple customers in batch (Soft Delete)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  batchRemove(@Body() dto: BatchDeleteCustomersDto, @GetUser("factoryId") factoryId: string) {
    if (!factoryId) throw new Error("Factory ID is required");
    return this.customersService.batchRemove(dto.customerIds, factoryId);
  }

  @Delete(":id")
  @Roles(Role.SALES) // nivel 2 mínimo
  @ApiOperation({ summary: "Deactivate a customer (Soft Delete)" })
  remove(@Param("id") id: string, @GetUser() user: any) {
    if (!user.factoryId) throw new Error("Factory ID is required");
    return this.customersService.remove(id, user.factoryId, user.userId, user.roles);
  }
}
