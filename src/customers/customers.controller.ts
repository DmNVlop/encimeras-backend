import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
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
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a new customer" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createCustomerDto: CreateCustomerDto, @GetUser("factoryId") factoryId: string) {
    // Fallback if factoryId is not in token yet
    const fid = factoryId || "000000000000000000000000";
    return this.customersService.create(createCustomerDto, fid);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES)
  @ApiOperation({ summary: "List all active customers" })
  findAll(@GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.customersService.findAll(fid);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.SALES)
  @ApiOperation({ summary: "Get customer details" })
  findOne(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.customersService.findOne(id, fid);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.SALES)
  @ApiOperation({ summary: "Update customer information (Admin & Sales)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param("id") id: string, @Body() updateCustomerDto: UpdateCustomerDto, @GetUser() user: any) {
    const fid = user.factoryId || "000000000000000000000000";
    return this.customersService.update(id, updateCustomerDto, fid, user.userId, user.roles);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Deactivate a customer (Soft Delete)" })
  remove(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.customersService.remove(id, fid);
  }

  @Post(":id/link/:userId")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Link customer to a platform user" })
  linkToUser(@Param("id") id: string, @Param("userId") userId: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.customersService.linkToUser(id, userId, fid);
  }
}
