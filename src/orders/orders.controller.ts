import { Controller, Post, Get, Body, Param, Query, Patch, Request } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UseGuards } from "@nestjs/common";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.USER) // nivel 0 mínimo → todos los roles autenticados
  async convertToOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    const userId = req.user.userId;

    const order = await this.ordersService.createFromDraft(createOrderDto, userId);
    return {
      message: "Orden generada con éxito",
      orderNumber: order.header.orderNumber,
      orderId: order._id,
    };
  }

  @Get()
  @Roles(Role.USER) // nivel 0 mínimo — la lógica interna filtra por rol
  async listAll(@Query("status") status?: string, @Request() req?: any) {
    const user = req.user;

    if (user.roles.includes(Role.ADMIN)) {
      return this.ordersService.findAllHeaders(status);
    }
    if (user.roles.includes(Role.OWNER) && user.factoryId) {
      return this.ordersService.findAllByFactory(user.factoryId, status);
    }
    if (user.roles.includes(Role.MANAGER)) {
      return this.ordersService.findAllByManager(user.userId, status);
    }
    if (user.roles.includes(Role.SALES)) {
      return this.ordersService.findAllHeaders(status, user.userId);
    }
    return this.ordersService.findAllHeaders(status, user.userId);
  }

  @Get(":id")
  @Roles(Role.USER) // nivel 0 mínimo
  async getDetail(@Param("id") id: string, @Request() req?: any) {
    const user = req.user;

    if (user.roles.includes(Role.ADMIN)) {
      return this.ordersService.findOne(id);
    }
    if (user.roles.includes(Role.OWNER) && user.factoryId) {
      return this.ordersService.findOneByFactory(id, user.factoryId);
    }
    if (user.roles.includes(Role.MANAGER)) {
      return this.ordersService.findOneByManager(id, user.userId);
    }
    if (user.roles.includes(Role.SALES)) {
      return this.ordersService.findOne(id);
    }
    return this.ordersService.findOne(id, user.userId);
  }

  @Patch(":id/status")
  @Roles(Role.WORKER) // nivel 1 mínimo → WORKER, SALES, MANAGER, OWNER, ADMIN
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }
}
