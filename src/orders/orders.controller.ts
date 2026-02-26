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
@UseGuards(JwtAuthGuard, RolesGuard) // 🔥 Aplicamos ambos guards
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Crear Orden: Accesible para Usuarios (Web) y Comerciales
  @Post()
  @Roles(Role.USER, Role.SALES, Role.ADMIN)
  async convertToOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // 🔥 SEGURIDAD: Usamos obligatoriamente el userId del token como customerId
    // para garantizar el aislamiento de datos (Multi-tenancy).
    const userId = req.user.userId;

    const order = await this.ordersService.createFromDraft(
      {
        ...createOrderDto,
        customerId: userId, // Sobrescribimos con identidad real del token
      },
      userId,
    );
    return {
      message: "Orden generada con éxito",
      orderNumber: order.header.orderNumber,
      orderId: order._id,
    };
  }

  // 2. Ver todas las órdenes: Solo Admin y Ventas
  @Get()
  @Roles(Role.ADMIN, Role.SALES, Role.USER)
  async listAll(@Query("status") status?: string, @Request() req?: any) {
    const user = req.user;
    // Si es USER, solo puede ver sus propias órdenes
    const ownerId = user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SALES) ? undefined : user.userId;

    return this.ordersService.findAllHeaders(status, ownerId);
  }

  // 3. Aprobar Orden: SOLO Admin (o Ventas si decides darle poder)
  @Get(":id")
  @Roles(Role.ADMIN, Role.SALES, Role.USER)
  async getDetail(@Param("id") id: string, @Request() req?: any) {
    const user = req.user;
    // Si no es admin/sales, pasamos el userId para validar propiedad
    const ownerId = user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SALES) ? undefined : user.userId;

    return this.ordersService.findOne(id, ownerId);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.SALES, Role.WORKER) // 🔥 USER fuera: Un cliente no puede marcar su orden como pagada
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }
}
