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
    // Sobrescribimos el customerId con el usuario real del token para evitar fraudes
    // - userId: ID de Mongo del usuario (para verificar propiedad del borrador)
    // - customerId: Email/Username visible (para guardar en el header de la orden)
    const userId = req.user.userId;
    const customerIdentifier = req.user.username || req.user.email || req.user.userId;

    // Este endpoint "quema" el borrador y crea la orden con el Shared-Header
    const order = await this.ordersService.createFromDraft(
      {
        ...createOrderDto,
        customerId: customerIdentifier,
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
  async listAll(@Query("status") status?: string) {
    // Endpoint para el Admin Panel
    // Solo devuelve los Headers para optimizar la carga del DataGrid [cite: 29]
    return this.ordersService.findAllHeaders(status);
  }

  // 3. Aprobar Orden: SOLO Admin (o Ventas si decides darle poder)
  @Get(":id")
  @Roles(Role.ADMIN, Role.SALES, Role.USER)
  async getDetail(@Param("id") id: string) {
    // Devuelve la orden completa incluyendo el TechnicalSnapshot para producción
    return this.ordersService.findOne(id);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.SALES, Role.USER)
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }
}
