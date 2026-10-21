import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger, Inject, forwardRef } from "@nestjs/common";
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
import { QuoteEventsService } from "../quote-events/quote-events.service";
import { QuoteEventType } from "../quote-events/schemas/quote-event.schema";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderSearchQueryDto } from "./dto/order-search-query.dto";
import { DisplayNamesService } from "../shared/display-names/display-names.service";
import {
  ORDER_TRANSITIONS,
  NOTE_REQUIRED_STATUSES,
  OrderStatus,
  StatusActor,
  allowedTargets,
  canManageAllStatuses,
  lastUndoableChange,
  requiresNote,
} from "./order-status-flow";

/** Prefijo de las órdenes que crean las baterías de prueba: las únicas que se pueden purgar. */
export const TEST_ORDER_PREFIX = "ZZ Prueba";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private draftsService: DraftsService,
    private eventsGateway: EventsGateway,
    private cartService: CartService,
    private usersService: UsersService,
    private quotesService: QuotesService,
    private dataScopeService: DataScopeService,
    private quoteEventsService: QuoteEventsService,
    private displayNames: DisplayNamesService,
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
          quoteTraceId: draft.quoteTraceId || QuoteEventsService.newTraceId(),
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
    this.recordOrdered(savedOrder, userId, { draftId: draft._id.toString() });

    return savedOrder;
  }

  /**
   * Bandeja del backoffice (y futura app de puesto): paginada en servidor, con contadores por estado
   * (sobre el alcance + texto, sin el filtro de estado), nombres resueltos y acciones de estado por fila.
   */
  async search(query: OrderSearchQueryDto, scope: DataScope, actor: StatusActor) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 25;
    const and: Record<string, any>[] = [this.dataScopeService.toOrderFilter(scope)];

    const text = query.q?.trim();
    if (text) {
      const rx = new RegExp(DisplayNamesService.escapeRegex(text), "i");
      const { userIds, customerIds } = await this.displayNames.findIdsByName(text);
      const or: Record<string, any>[] = [{ "header.orderNumber": rx }, { "header.orderName": rx }];
      if (userIds.length) or.push({ "header.userId": { $in: userIds } });
      if (customerIds.length) or.push({ "header.customerId": { $in: customerIds } });
      and.push({ $or: or });
    }

    const base = { $and: and };
    const filter = query.status?.length ? { $and: [...and, { "header.status": { $in: query.status } }] } : base;

    const [orders, total, countRows] = await Promise.all([
      this.orderModel.find(filter).sort({ "header.orderDate": -1, _id: -1 }).skip(page * limit).limit(limit).select("header").lean(),
      this.orderModel.countDocuments(filter),
      this.orderModel.aggregate([{ $match: base }, { $group: { _id: "$header.status", count: { $sum: 1 } } }]),
    ]);

    const [users, customers] = await Promise.all([
      this.displayNames.userNames(orders.map((o: any) => o.header.userId)),
      this.displayNames.customerNames(orders.map((o: any) => o.header.customerId)),
    ]);

    return {
      items: orders.map((o: any) => {
        const { statusHistory, ...header } = o.header;
        return {
          _id: o._id.toString(),
          ...header,
          userName: users.get(String(header.userId))?.name,
          customerName: customers.get(String(header.customerId))?.name,
          lastStatusChangeAt: statusHistory?.length ? statusHistory[statusHistory.length - 1].at : header.orderDate,
          statusActions: this.statusActionsFor(o.header, actor),
        };
      }),
      total,
      page,
      limit,
      counts: Object.fromEntries(countRows.map((r) => [r._id, r.count])),
    };
  }

  /** Detalle + acciones de estado que el usuario puede hacer sobre esa orden (el FE no replica permisos) + nombres (BFF). */
  async findOneWithActions(id: string, scope: DataScope, actor: StatusActor): Promise<any> {
    const order: any = await this.findOne(id, scope);
    const [users, customers] = await Promise.all([
      this.displayNames.userNames([order.header.userId]),
      this.displayNames.customerNames([order.header.customerId]),
    ]);
    const user = users.get(String(order.header.userId));
    const customer = customers.get(String(order.header.customerId));
    return {
      ...order,
      display: { userName: user?.name, userEmail: user?.email, customerName: customer?.name, customerEmail: customer?.email },
      statusActions: this.statusActionsFor(order.header, actor),
    };
  }

  private statusActionsFor(header: any, actor: StatusActor) {
    const undoable = lastUndoableChange(header.statusHistory);
    return {
      targets: allowedTargets(header.status, header.userId, actor),
      noteRequired: NOTE_REQUIRED_STATUSES,
      canUndo: canManageAllStatuses(actor.roles) && !!undoable && undoable.to === header.status,
      undoTo: undoable?.from ?? null,
    };
  }

  /**
   * Cambio de estado validado contra el flujo (order-status-flow.ts): fuera de alcance ⇒ 404,
   * transición inexistente ⇒ 400, sin permiso para esa transición ⇒ 403, falta nota obligatoria ⇒ 400.
   * Escritura atómica condicionada al estado leído: si otro lo cambió entre medias ⇒ 409.
   */
  async changeStatus(id: string, dto: UpdateOrderStatusDto, actor: StatusActor & { name?: string; username?: string }, scope: DataScope): Promise<Order> {
    const order: any = await this.findOne(id, scope);
    const from = order.header.status;
    const to = dto.status;
    const note = dto.note?.trim() || undefined;

    if (!(ORDER_TRANSITIONS[from as OrderStatus] ?? []).includes(to as OrderStatus)) {
      const valid = ORDER_TRANSITIONS[from as OrderStatus] ?? [];
      throw new BadRequestException(`Transición no válida: ${from} → ${to}. Desde ${from} solo se puede pasar a: ${valid.join(", ") || "ninguno (estado final)"}`);
    }
    if (!allowedTargets(from, order.header.userId, actor).includes(to as OrderStatus)) {
      throw new ForbiddenException(`Tu rol no permite pasar la orden de ${from} a ${to}`);
    }
    if (requiresNote(to) && !note) {
      throw new BadRequestException(`La nota es obligatoria para pasar a ${to}`);
    }

    return this.applyStatusChange(order, { from, to, note }, actor, scope);
  }

  /** «Deshacer último cambio» (OWNER o superior, nota obligatoria): añade una entrada `undo` que revierte el último cambio vigente. */
  async undoLastStatus(id: string, note: string, actor: StatusActor & { name?: string; username?: string }, scope: DataScope): Promise<Order> {
    if (!canManageAllStatuses(actor.roles)) {
      throw new ForbiddenException("Solo OWNER o ADMIN pueden deshacer cambios de estado");
    }
    const order: any = await this.findOne(id, scope);
    const last = lastUndoableChange(order.header.statusHistory);
    if (!last) throw new BadRequestException("Esta orden no tiene cambios de estado que deshacer");
    if (last.to !== order.header.status) {
      throw new ConflictException(`El historial no coincide con el estado actual (${order.header.status}); no se puede deshacer`);
    }

    return this.applyStatusChange(order, { from: order.header.status, to: last.from, note: note.trim(), undo: true }, actor, scope);
  }

  private async applyStatusChange(
    order: any,
    change: { from: string; to: string; note?: string; undo?: boolean },
    actor: StatusActor & { name?: string; username?: string },
    scope: DataScope,
  ): Promise<Order> {
    const entry = {
      ...change,
      by: String(actor.userId),
      byName: actor.name || actor.username,
      byRoles: actor.roles ?? [],
      at: new Date(),
    };
    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, "header.status": change.from, ...this.dataScopeService.toOrderFilter(scope) },
        { $set: { "header.status": change.to }, $push: { "header.statusHistory": entry } },
        { new: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new ConflictException("La orden cambió de estado mientras tanto; recárgala y vuelve a intentarlo");
    }

    await this.notifyOrder("update", updatedOrder);
    return updatedOrder;
  }

  /**
   * Purga de una orden de PRUEBA (solo ADMIN, lo exige el controller): solo si su nombre empieza por «ZZ Prueba».
   * Borra también la trazabilidad de sus presupuestos y deja en el log quién purgó qué.
   */
  async purgeTestOrder(id: string, adminUserId: string): Promise<{ deleted: number; quoteEventsDeleted: number }> {
    const order = await this.orderModel.findById(id).select("header.orderName header.orderNumber items.quoteTraceId").lean();
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    if (!order.header.orderName.startsWith(TEST_ORDER_PREFIX)) {
      throw new BadRequestException(`Solo se pueden purgar órdenes de prueba (nombre «${TEST_ORDER_PREFIX}…»)`);
    }

    let quoteEventsDeleted = 0;
    for (const traceId of new Set(order.items.map((i) => i.quoteTraceId).filter(Boolean) as string[])) {
      quoteEventsDeleted += (await this.quoteEventsService.purgeTrace(traceId, adminUserId, { includeOrdered: true })).deleted;
    }
    const { deletedCount } = await this.orderModel.deleteOne({ _id: id });
    this.logger.warn(`Purga de orden de prueba: ADMIN ${adminUserId} borró ${order.header.orderNumber} «${order.header.orderName}»`);
    return { deleted: deletedCount, quoteEventsDeleted };
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
      quoteTraceId: item.quoteTraceId || QuoteEventsService.newTraceId(),
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
    this.recordOrdered(savedOrder, userId, { cartItems: cartData.items });

    return savedOrder;
  }

  /** Trazabilidad: un evento ORDERED por presupuesto de la orden (enlaza con su draft/cart item de origen). */
  private recordOrdered(order: Order, userId: string, origin: { draftId?: string; cartItems?: any[] }): void {
    this.quoteEventsService.record(
      order.items.map((item, index) => ({
        ...QuoteEventsService.snapshotOf(item),
        quoteTraceId: item.quoteTraceId!,
        type: QuoteEventType.ORDERED,
        userId,
        customerId: item.core?.customerId ?? order.header.customerId,
        draftId: origin.draftId ?? (origin.cartItems?.[index]?.draftId ? String(origin.cartItems[index].draftId) : undefined),
        cartItemId: origin.cartItems?.[index]?.cartItemId,
        orderId: order._id!.toString(),
        orderNumber: order.header.orderNumber,
      })),
    );
  }

  // Helper para generar IDs tipo "ORD-2026-0045": último número del año + 1. Con `countDocuments` un hueco
  // (orden borrada que no era la última) repetía un número existente y el índice único rompía el checkout.
  private async generateOrderNumber(): Promise<string> {
    const prefix = `ORD-${new Date().getFullYear()}-`;
    const last = await this.orderModel
      .findOne({ "header.orderNumber": { $regex: `^${prefix}\\d+$` } })
      .sort({ "header.orderNumber": -1 })
      .select("header.orderNumber")
      .lean();
    const lastSequence = last ? parseInt(last.header.orderNumber.slice(prefix.length), 10) : 0;
    // Rellena con ceros: 0001, 0002...
    return `${prefix}${(lastSequence + 1).toString().padStart(4, "0")}`;
  }
}
