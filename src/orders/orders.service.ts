import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/create-order.dto";
import { DraftsService } from "../drafts/drafts.service";
import { EventsGateway } from "../events/events.gateway";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private draftsService: DraftsService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Obtiene todas las órdenes pero filtrando solo el "Shared Header".
   * Esto optimiza el rendimiento del Panel de Administración (DataGrid).
   */
  async findAllHeaders(status?: string): Promise<any[]> {
    const query = status ? { "header.status": status } : {};

    return this.orderModel
      .find(query)
      .select("header") // <--- Proyección: Solo traemos la cabecera
      .sort({ "header.orderDate": -1 }) // Ordenar por las más recientes
      .lean(); // Retorna objetos planos de JS (más rápido que documentos Mongoose)
  }

  /**
   * Obtiene el detalle completo de una orden, incluyendo el technicalSnapshot.
   * Se usa cuando el administrador entra en la ficha de producción.
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).lean();

    if (!order) {
      throw new NotFoundException(`La orden con ID ${id} no existe.`);
    }

    return order as Order;
  }

  async createFromDraft(createOrderDto: CreateOrderDto): Promise<Order> {
    // 1. Recuperar el Borrador
    // Nota: Usamos findOne del servicio para asegurar que se recalculó si estaba expirado
    const draftResult = await this.draftsService.findOne(createOrderDto.draftId);
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
        customerId: createOrderDto.customerId,
        status: "PENDING",
        totalPoints: draft.currentPricePoints, // Precio congelado
        orderDate: new Date(),
        // deliveryDate: createOrderDto.deliveryInfo?.date // Si existiera
      },
      items: [
        {
          type: "COUNTERTOP_PROJECT",
          technicalSnapshot: {
            // Copia profunda del estado del QuoteContext
            materials: [draft.configuration.wizardTempMaterial],
            pieces: draft.configuration.mainPieces,
            // Asumiendo que guardaste addons globales o por pieza
            addons: draft.configuration.globalAddons || [],
          },
        },
      ],
      originDraftId: draft._id,
    });

    // 5. Guardar Orden y "Quemar" el Borrador
    const savedOrder = await newOrder.save();
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
