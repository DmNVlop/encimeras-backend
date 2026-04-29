import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { Order } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/create-order.dto";
import { DraftsService } from "../drafts/drafts.service";
import { EventsGateway } from "../events/events.gateway";
import { CartService } from "../cart/cart.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private draftsService: DraftsService,
    private eventsGateway: EventsGateway,
    private cartService: CartService,
    private usersService: UsersService,
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
   * Obtiene todas las órdenes pero filtrando solo el "Shared Header".
   * Si se pasa ownerId, se filtra para que el usuario solo vea lo suyo.
   */
  async findAllHeaders(status?: string, ownerId?: string): Promise<any[]> {
    const query: any = {};
    if (status) query["header.status"] = status;
    if (ownerId) query["header.userId"] = ownerId;

    return this.orderModel.find(query).select("header").sort({ "header.orderDate": -1 }).lean();
  }

  async findAllByFactory(factoryId: string, status?: string): Promise<any[]> {
    const query: any = {};
    if (status) query["header.status"] = status;

    const orders = await this.orderModel.find(query).select("header").sort({ "header.orderDate": -1 }).lean();

    return orders;
  }

  async findAllByManager(managerId: string, status?: string): Promise<any[]> {
    const salesUsers = await this.usersService.findManagedByManager(managerId);
    const salesIds = salesUsers.map((u) => (u as any)._id.toString());
    const ownerIds = [managerId, ...salesIds];

    const query: any = { "header.userId": { $in: ownerIds } };
    if (status) query["header.status"] = status;

    return this.orderModel.find(query).select("header").sort({ "header.orderDate": -1 }).lean();
  }

  async findOneByManager(id: string, managerId: string): Promise<Order> {
    const salesUsers = await this.usersService.findManagedByManager(managerId);
    const salesIds = salesUsers.map((u) => (u as any)._id.toString());
    const ownerIds = [managerId, ...salesIds];

    const order = await this.orderModel.findOne({ _id: id, "header.userId": { $in: ownerIds } }).lean();

    if (!order) {
      throw new NotFoundException(`La orden con ID ${id} no existe o no tienes permiso para verla.`);
    }
    return order as unknown as Order;
  }

  /**
   * Obtiene el detalle completo de una orden, incluyendo el technicalSnapshot.
   * Se añade validación de propiedad si se proporciona ownerId (para rol USER).
   */
  async findOne(id: string, ownerId?: string): Promise<Order> {
    const query: any = { _id: id };
    if (ownerId) query["header.userId"] = ownerId;

    const order = await this.orderModel.findOne(query).lean();

    if (!order) {
      throw new NotFoundException(`La orden con ID ${id} no existe o no tienes permiso para verla.`);
    }

    return order as unknown as Order;
  }

  async findOneByFactory(id: string, factoryId: string): Promise<Order> {
    const order = await this.orderModel.findById(id).lean();

    if (!order) {
      throw new NotFoundException(`La orden con ID ${id} no existe o no tienes permiso para verla.`);
    }

    return order as unknown as Order;
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

    // 3. Generar ID Secuencial (Ejemplo simple, idealmente usar una colección de contadores atómicos)
    const orderNumber = await this.generateOrderNumber();

    // 4. Construir el Shared-Header y el Snapshot Técnico
    const newOrder = new this.orderModel({
      header: {
        orderNumber: orderNumber,
        orderName: createOrderDto.orderName,
        userId: userId,
        customerId: createOrderDto.customerId || draft.core.customerId,
        status: "PENDING",
        totalPoints: draft.currentPricePoints, // Precio congelado
        orderDate: new Date(),
        // deliveryDate: createOrderDto.deliveryInfo?.date // Si existiera
      },
      items: [
        {
          type: "COUNTERTOP_PROJECT",
          cartItemName: draft.name || "Proyecto desde Borrador",
          core: draft.core,
          uiState: draft.uiState,
          originalPoints: (draft as any).originalPoints || draft.currentPricePoints,
          discountAmount: (draft as any).discountAmount || 0,
        },
      ],
      originDraftId: draft._id,
    });

    newOrder.header.totalOriginalPoints = (draft as any).originalPoints || draft.currentPricePoints;
    newOrder.header.totalDiscount = (draft as any).discountAmount || 0;

    // 5. Guardar Orden y "Quemar" el Borrador
    const savedOrder = await this.saveOrderWithAutoNaming(newOrder, userId, createOrderDto.orderName);
    await this.draftsService.markAsConverted(draft._id);

    // Convertir a Objeto Plano (Limpia toda la basura interna de Mongoose)
    const orderObject = savedOrder.toObject();

    // 🔥 CORRECCIÓN: Enviamos el header PERO le pegamos el ID real
    // convertimos a objeto plano (.toObject()) para poder mezclar propiedades
    const payload = {
      ...orderObject.header,
      _id: orderObject._id,
    };

    // 🔥 Notificación en tiempo real
    this.eventsGateway.notifyNewOrder(payload);

    return savedOrder;
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        { $set: { "header.status": status } },
        { new: true }, // Devuelve el documento actualizado
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    // 🔥 CORRECCIÓN CRÍTICA: Convertir a objeto plano y stringificar ID
    const plainOrder: any = updatedOrder.toObject();

    const socketPayload = {
      ...plainOrder.header, // Esparce status, orderNumber, etc.
      _id: plainOrder._id.toString(), // Fuerza que sea string
    };

    // Log para verificar en consola del servidor
    console.log("Emitiendo evento socket update:", socketPayload);

    this.eventsGateway.notifyOrderUpdate(socketPayload);

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

    // 3. Mapear cada CartItem a un OrderLineItem — snapshot inmutable completo
    const orderItems = cartData.items.map((item: any) => ({
      type: "COUNTERTOP_PROJECT",
      cartItemName: item.customName, // Trazabilidad: "Cocina de Juana"
      core: item.core,
      uiState: item.uiState,
      originalPoints: item.originalPoints || item.subtotalPoints,
      discountAmount: item.discountAmount || 0,
      subtotalPoints: item.subtotalPoints, // ← Precio final con descuento por ítem
      appliedRules: item.appliedRules || [], // ← Reglas de descuento aplicadas al ítem
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
    const orderObject = savedOrder.toObject();
    const payload = {
      ...orderObject.header,
      _id: orderObject._id,
    };
    this.eventsGateway.notifyNewOrder(payload);

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
