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

    if ((user.roles.includes(Role.OWNER) || user.roles.includes(Role.MANAGER)) && user.factoryId) {
      return this.ordersService.findAllByFactory(user.factoryId, status);
    }

    const isBroadAccess = user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SALES) || user.roles.includes(Role.MANAGER);
    const ownerId = isBroadAccess ? undefined : user.userId;
    return this.ordersService.findAllHeaders(status, ownerId);
  }

  @Get(":id")
  @Roles(Role.USER) // nivel 0 mínimo
  async getDetail(@Param("id") id: string, @Request() req?: any) {
    const user = req.user;

    if ((user.roles.includes(Role.OWNER) || user.roles.includes(Role.MANAGER)) && user.factoryId) {
      return this.ordersService.findOneByFactory(id, user.factoryId);
    }

    const isBroadAccess = user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SALES) || user.roles.includes(Role.MANAGER);
    const ownerId = isBroadAccess ? undefined : user.userId;
    return this.ordersService.findOne(id, ownerId);
  }

  @Patch(":id/status")
  @Roles(Role.WORKER) // nivel 1 mínimo → WORKER, SALES, MANAGER, OWNER, ADMIN
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }
}
