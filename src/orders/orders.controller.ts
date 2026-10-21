import { Controller, Post, Get, Body, Param, Query, Patch, Request } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UseGuards } from "@nestjs/common";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";
import { DataScopeService } from "../shared/scope/data-scope.service";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly dataScopeService: DataScopeService,
  ) {}

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
  @Roles(Role.USER) // nivel 0 mínimo — el alcance lo resuelve DataScopeService
  async listAll(@Query("status") status?: string, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.findAllHeaders(scope, status);
  }

  @Get(":id")
  @Roles(Role.USER) // nivel 0 mínimo
  async getDetail(@Param("id") id: string, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.findOne(id, scope);
  }

  @Patch(":id/status")
  @Roles(Role.WORKER) // nivel 1 mínimo → WORKER, SALES, MANAGER, OWNER, ADMIN
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status, scope);
  }
}
