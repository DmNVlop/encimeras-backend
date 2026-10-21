import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { Order } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/create-order.dto";
import { DraftsService } from "../drafts/drafts.service";
import { EventsGateway } from "../events/events.gateway";
import { CartService } from "../cart/cart.service";
import { UsersService } from "../users/users.service";
import { QuotesService } from "../quotes/quotes.service";
import { DataScope, DataScopeService } from "../shared/scope/data-scope.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private draftsService: DraftsService,
    private eventsGateway: EventsGateway,
    private cartService: CartService,
    private usersService: UsersService,
    private quotesService: QuotesService,
    private dataScopeService: DataScopeService,
  ) {}

  /**
   * Busca el siguiente nombre disponible para un orderName que ya existe.
   * Si el nombre base no existe, lo retorna tal cual.
   * Si existe, busca el siguiente número disponible en el patrón "Nombre (n)".
   */
  private async findNextAvailableOrderName(userId: string, baseName: string): Promise<string> {
    const escapedName = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapedName}\\s*\\((\\d+)\\)$`);

    const existingOrders = await this.orderModel
      .find({
        "header.userId": userId,
        "header.orderName": { $regex: pattern },
      })
      .select("header.orderName")
      .lean();

    const usedNumbers = new Set(
      existingOrders.map((order) => {
        const match = order.header.orderName.match(/\((\d+)\)$/);
        return match ? parseInt(match[1], 10) : 0;
      }),
    );

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return `${baseName} (${nextNumber})`;
  }

  /**
   * Intenta guardar una orden, manejando conflictos de nombre único con auto-numeración.
   */
  private async saveOrderWithAutoNaming(order: InstanceType<Model<Order>>, userId: string, baseName: string): Promise<Order> {
    try {
      return await order.save();
    } catch (error: any) {
      if (error.code === 11000) {
        const newName = await this.findNextAvailableOrderName(userId, baseName);
        (order as any).header.orderName = newName;
        return this.saveOrderWithAutoNaming(order, userId, newName);
      }
      throw error;
    }
  }

  /**
   * Lista las órdenes (solo el "Shared Header") dentro del alcance del usuario.
   * El alcance lo resuelve DataScopeService (política única de "quién ve qué").
   */
  async findAllHeaders(scope: DataScope, status?: string): Promise<any[]> {
    const query: any = this.dataScopeService.toOrderFilter(scope);
    if (status) query["header.status"] = status;

    return this.orderModel.find(query).select("header").sort({ "header.orderDate": -1 }).lean();
  }

  /**
   * Detalle completo de una orden, incluyendo el technicalSnapshot.
   * Fuera del alcance del usuario responde 404 (no revela que existe).
   */
  async findOne(id: string, scope: DataScope): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: id, ...this.dataScopeService.toOrderFilter(scope) }).lean();

    if (!order) {
      throw new NotFoundException(`La orden con ID ${id} no existe o no tienes permiso para verla.`);
    }

    return order as unknown as Order;
  }

  /**
   * Garantiza el invariante "1 Order = 1 factoryId": usa el factoryId del item si existe,
   * si no cae al factoryId del usuario dueño de la orden. Si ninguno existe, no hay forma
   * válida de asignar la orden a una fábrica.
   */
  /**
   * Notifica por socket el header de la orden (con `_id` string) solo a las salas de quienes pueden verla.
   * Efecto secundario: un fallo aquí nunca rompe la operación ya persistida.
   */
  private async notifyOrder(kind: "new" | "update", order: any): Promise<void> {
    try {
      const plain = typeof order.toObject === "function" ? order.toObject() : order;
      const payload = { ...plain.header, _id: plain._id.toString() };
      const rooms = await this.dataScopeService.orderAudienceRooms(plain.header, plain.items?.[0]?.core?.factoryId);
      if (kind === "new") this.eventsGateway.notifyNewOrder(payload, rooms);
      else this.eventsGateway.notifyOrderUpdate(payload, rooms);
    } catch (error: any) {
      console.error(`No se pudo notificar la orden por socket: ${error.message}`);
    }
  }

  private async resolveFactoryId(itemFactoryId: string | undefined, userId: string): Promise<string> {
    if (itemFactoryId) return itemFactoryId;

    const owner = await this.usersService.findOne(userId);
    const userFactoryId = (owner as any).factoryId;
    if (userFactoryId) return userFactoryId.toString();

    throw new BadRequestException("No se pudo determinar la fábrica (factoryId) para esta orden. Verifica que el cliente o el usuario tengan una fábrica asignada.");
  }

  async createFromDraft(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    // 1. Recuperar el Borrador
    // Nota: Usamos findOne del servicio para asegurar que se recalculó si estaba expirado
    // CORRECCIÓN: Usamos userId (Mongo ID) para verificar propiedad, NO el customerId (Email)
    const draftResult = await this.draftsService.findOne(createOrderDto.draftId, userId);
    const draft = draftResult.data;

    // 2. Validaciones de Integridad
    if (draftResult.status === "EXPIRED_RECALCULATED") {
      // Opcional: Podríamos rechazar la orden si el cliente no ha visto el precio nuevo
      // Por ahora lo permitimos asumiendo que el frontend ya mostró el aviso
    }

    // 3. Generar ID Secuencial
    const orderNumber = await this.generateOrderNumber();

    // 3a. Garantizar factoryId (invariante: 1 Order = 1 factoryId)
    const resolvedFactoryId = await this.resolveFactoryId(draft.core.factoryId, userId);
    draft.core.factoryId = resolvedFactoryId;

    // 3b. Resolver breakdown por pieza — usar el del draft si existe, recalcular si no
    let draftBreakdown: any[] = (draft as any).piecesBreakdown || [];
    if (draftBreakdown.length === 0) {
      try {
        const calc = await this.quotesService.calculate({
          mainPieces: draft.core.mainPieces,
          factoryId: draft.core.factoryId,
          customerId: draft.core.customerId || userId,
        });
        draftBreakdown = calc.pieces;
      } catch {
        // Fallback silencioso — breakdown queda vacío
      }
    }

    // 4. Construir el Shared-Header y el Snapshot Técnico
    const newOrder = new this.orderModel({
      header: {
        orderNumber: orderNumber,
        orderName: createOrderDto.orderName,
        userId: userId,
        customerId: createOrderDto.customerId || draft.core.customerId,
        status: "PENDING",
        totalPoints: draft.currentPricePoints,
        orderDate: new Date(),
      },
      items: [
        {
          type: "COUNTERTOP_PROJECT",
          cartItemName: draft.name || "Proyecto desde Borrador",
          core: draft.core,
          uiState: draft.uiState,
          originalPoints: (draft as any).originalPoints || draft.currentPricePoints,
          discountAmount: (draft as any).discountAmount || 0,
          subtotalPoints: draft.currentPricePoints,
          piecesBreakdown: draftBreakdown,
        },
      ],
      originDraftId: draft._id,
    });

    newOrder.header.totalOriginalPoints = (draft as any).originalPoints || draft.currentPricePoints;
    newOrder.header.totalDiscount = (draft as any).discountAmount || 0;

    // 5. Guardar Orden y "Quemar" el Borrador
    const savedOrder = await this.saveOrderWithAutoNaming(newOrder, userId, createOrderDto.orderName);
    await this.draftsService.markAsConverted(draft._id);

    // 🔥 Notificación en tiempo real (solo a quienes pueden ver la orden)
    await this.notifyOrder("new", savedOrder);

    return savedOrder;
  }

  async updateStatus(id: string, status: string, scope: DataScope): Promise<Order> {
    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { _id: id, ...this.dataScopeService.toOrderFilter(scope) },
        { $set: { "header.status": status } },
        { new: true }, // Devuelve el documento actualizado
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    await this.notifyOrder("update", updatedOrder);

    return updatedOrder;
  }

  async createFromCart(userId: string, orderName: string): Promise<Order> {
    // 1. Recuperar el Carrito ACTIVO
    const cartData = await this.cartService.getOrCreateCart(userId);

    if (!cartData || cartData.items.length === 0) {
      throw new BadRequestException("El carrito está vacío.");
    }

    // 2. Generar ID Secuencial
    const orderNumber = await this.generateOrderNumber();

    // 2a. Garantizar factoryId (invariante: 1 Order = 1 factoryId único para todos los items)
    const resolvedFactoryId = await this.resolveFactoryId(cartData.items[0]?.core?.factoryId, userId);
    for (const item of cartData.items) {
      const itemFactoryId = item.core.factoryId || resolvedFactoryId;
      if (itemFactoryId !== resolvedFactoryId) {
        throw new BadRequestException("El carrito contiene ítems de fábricas distintas. Una orden solo puede pertenecer a una única fábrica.");
      }
      item.core.factoryId = resolvedFactoryId;
    }

    // 3. Mapear cada CartItem a un OrderLineItem — snapshot inmutable completo
    const orderItems = cartData.items.map((item: any) => ({
      type: "COUNTERTOP_PROJECT",
      cartItemName: item.customName,
      core: item.core,
      uiState: item.uiState,
      originalPoints: item.originalPoints || item.subtotalPoints,
      discountAmount: item.discountAmount || 0,
      subtotalPoints: item.subtotalPoints,
      appliedRules: item.appliedRules || [],
      piecesBreakdown: item.piecesBreakdown || [],
    }));

    // 4. Crear la Orden Unificada
    const newOrder = new this.orderModel({
      header: {
        orderNumber: orderNumber,
        orderName: orderName,
        userId: userId,
        customerId: cartData.customerId ?? (cartData.items.length > 0 ? cartData.items[0].core?.customerId : undefined),
        status: "PENDING",
        totalPoints: cartData.totalPoints,
        totalOriginalPoints: cartData.totalOriginalPoints || cartData.totalPoints,
        totalDiscount: cartData.totalDiscount || 0,
        orderDate: new Date(),
      },
      items: orderItems,
      appliedGlobalRules: cartData.appliedGlobalRules || [], // ← Reglas globales de descuento del carrito
    });

    // 5. Guardar Orden
    const savedOrder = await this.saveOrderWithAutoNaming(newOrder, userId, orderName);

    // 6. "Cerrar" el carrito (Marcar como convertido)
    // Usamos el modelo para actualizar status.
    await (this.cartService as any).cartModel.findOneAndUpdate({ userId, status: "ACTIVE" }, { status: "CONVERTED" });

    // 7. Notificar
    await this.notifyOrder("new", savedOrder);

    return savedOrder;
  }

  // Helper para generar IDs tipo "ORD-2026-0045"
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderModel.countDocuments({
      "header.orderDate": {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    // Rellena con ceros: 0001, 0002...
    const sequence = (count + 1).toString().padStart(4, "0");
    return `ORD-${year}-${sequence}`;
  }
}
