import { Controller, Post, Get, Delete, Body, Param, Query, Patch, Request, HttpCode } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto, UndoOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderSearchQueryDto } from "./dto/order-search-query.dto";
import { statusFlowDescriptor } from "./order-status-flow";
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

  // Rutas fijas antes de ":id"
  // Bandeja paginada (backoffice y futura app de puesto): el alcance lo resuelve DataScopeService
  @Get("search")
  @Roles(Role.USER)
  async search(@Query() query: OrderSearchQueryDto, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.search(query, scope, req.user);
  }

  @Get("status-flow")
  @Roles(Role.USER)
  getStatusFlow() {
    return statusFlowDescriptor();
  }

  @Get(":id")
  @Roles(Role.USER) // nivel 0 mínimo
  async getDetail(@Param("id") id: string, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.findOneWithActions(id, scope, req.user);
  }

  // Cualquier rol: el servicio valida transición y permiso por rol (USER/SALES/MANAGER solo cancelan lo suyo en PENDING)
  @Patch(":id/status")
  @Roles(Role.USER)
  async updateStatus(@Param("id") id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.changeStatus(id, updateOrderStatusDto, req.user, scope);
  }

  @Post(":id/status/undo")
  @HttpCode(200) // revierte un cambio, no crea recurso
  @Roles(Role.OWNER) // nivel 4 mínimo → OWNER, ADMIN
  async undoStatus(@Param("id") id: string, @Body() dto: UndoOrderStatusDto, @Request() req?: any) {
    const scope = await this.dataScopeService.resolve(req.user);
    return this.ordersService.undoLastStatus(id, dto.note, req.user, scope);
  }

  // Solo órdenes de prueba («ZZ Prueba…») de las baterías test:demo
  @Delete(":id")
  @Roles(Role.ADMIN)
  purgeTestOrder(@Param("id") id: string, @Request() req?: any) {
    return this.ordersService.purgeTestOrder(id, req.user.userId);
  }
}
