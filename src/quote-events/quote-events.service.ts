import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import { QuoteEvent, QuoteEventType } from "./schemas/quote-event.schema";
import { User } from "../users/schemas/users.schema";
import { Cart, CartDocument } from "../cart/schemas/cart.schema";
import { Order } from "../orders/schemas/order.schema";
import { DataScope, DataScopeService } from "../shared/scope/data-scope.service";

export interface QuoteEventInput {
  quoteTraceId: string;
  type: QuoteEventType;
  userId?: string | null;
  factoryId?: string | null;
  customerId?: string | null;
  draftId?: string;
  cartItemId?: string;
  orderId?: string;
  orderNumber?: string;
  source?: string;
  totalPoints?: number;
  originalPoints?: number;
  discountAmount?: number;
  piecesCount?: number;
}

/** Forma mínima de un draft, cart item u order item de la que se saca el snapshot del evento. */
interface TraceableItem {
  quoteTraceId?: string;
  core?: { mainPieces?: any[]; factoryId?: string; customerId?: string };
  subtotalPoints?: number;
  currentPricePoints?: number;
  originalPoints?: number;
  discountAmount?: number;
}

/**
 * Trazabilidad de presupuestos (colección append-only `quote_events`).
 * Registrar un evento es un efecto secundario: nunca rompe la operación principal.
 */
@Injectable()
export class QuoteEventsService {
  private readonly logger = new Logger(QuoteEventsService.name);

  constructor(
    @InjectModel(QuoteEvent.name) private quoteEventModel: Model<QuoteEvent>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private dataScopeService: DataScopeService,
  ) {}

  /** Id nuevo para un presupuesto que llega sin él (datos anteriores a la trazabilidad). */
  static newTraceId(): string {
    return randomUUID();
  }

  /** Snapshot común (precio, piezas, fábrica, cliente) de un draft, cart item u order item. */
  static snapshotOf(item: TraceableItem): Partial<QuoteEventInput> {
    return {
      factoryId: item.core?.factoryId,
      customerId: item.core?.customerId,
      totalPoints: item.subtotalPoints ?? item.currentPricePoints,
      originalPoints: item.originalPoints,
      discountAmount: item.discountAmount,
      piecesCount: item.core?.mainPieces?.length,
    };
  }

  /** Registra eventos sin esperar ni propagar errores (fire-and-forget). */
  record(events: QuoteEventInput | QuoteEventInput[]): void {
    void this.persist(Array.isArray(events) ? events : [events]).catch((error: any) => {
      this.logger.error(`No se pudieron registrar eventos de presupuesto: ${error.message}`);
    });
  }

  /** PDF descargado: los presupuestos se resuelven en servidor (carrito activo del usuario u orden en su alcance). */
  async recordPdfDownload(user: { userId: string; roles: any[]; factoryId?: string | null }, source: "cart" | "order", orderId?: string): Promise<{ recorded: number }> {
    const events = source === "cart" ? await this.pdfEventsFromCart(user.userId) : await this.pdfEventsFromOrder(user, orderId!);
    await this.persist(events);
    return { recorded: events.length };
  }

  /** Cronología de un presupuesto dentro del alcance del usuario (lo ajeno no aparece). */
  async findTimeline(quoteTraceId: string, scope: DataScope): Promise<QuoteEvent[]> {
    return this.quoteEventModel
      .find({ quoteTraceId, ...this.dataScopeService.toQuoteEventFilter(scope) })
      .sort({ createdAt: 1 })
      .lean() as any;
  }

  /**
   * Única excepción al append-only: purga de una traza que nunca llegó a orden (datos de prueba).
   * Solo ADMIN (lo exige el controller); deja en el log quién purgó qué.
   */
  async purgeTrace(quoteTraceId: string, adminUserId: string): Promise<{ deleted: number }> {
    if (await this.quoteEventModel.exists({ quoteTraceId, type: QuoteEventType.ORDERED })) {
      throw new ConflictException("No se puede purgar la traza de un presupuesto que llegó a orden");
    }
    const { deletedCount } = await this.quoteEventModel.deleteMany({ quoteTraceId });
    this.logger.warn(`Purga de trazabilidad: ADMIN ${adminUserId} borró ${deletedCount} eventos de ${quoteTraceId}`);
    return { deleted: deletedCount };
  }

  private async pdfEventsFromCart(userId: string): Promise<QuoteEventInput[]> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).lean();
    if (!cart || !cart.items?.length) throw new NotFoundException("El carrito está vacío");

    // Ítems anteriores a la trazabilidad: se les asigna un id ahora (una sola escritura) para enlazar descargas futuras.
    const untraced = cart.items.filter((item: any) => !item.quoteTraceId);
    if (untraced.length) {
      untraced.forEach((item: any) => (item.quoteTraceId = QuoteEventsService.newTraceId()));
      await this.cartModel.bulkWrite(
        untraced.map((item: any) => ({
          updateOne: {
            filter: { _id: cart._id, "items.cartItemId": item.cartItemId },
            update: { $set: { "items.$.quoteTraceId": item.quoteTraceId } },
          },
        })),
      );
    }

    return cart.items.map((item: any) => ({
      ...QuoteEventsService.snapshotOf(item),
      quoteTraceId: item.quoteTraceId,
      type: QuoteEventType.PDF_DOWNLOADED,
      userId,
      customerId: item.core?.customerId ?? (cart.customerId ? String(cart.customerId) : undefined),
      draftId: item.draftId ? String(item.draftId) : undefined,
      cartItemId: item.cartItemId,
      source: "cart",
    }));
  }

  private async pdfEventsFromOrder(user: { userId: string; roles: any[]; factoryId?: string | null }, orderId: string): Promise<QuoteEventInput[]> {
    const scope = await this.dataScopeService.resolve(user as any);
    const order = await this.orderModel.findOne({ _id: orderId, ...this.dataScopeService.toOrderFilter(scope) }).lean();
    if (!order) throw new NotFoundException(`La orden con ID ${orderId} no existe o no tienes permiso para verla.`);

    // La orden es inmutable: sus ítems sin id (anteriores a la trazabilidad) usan uno determinista por posición.
    return order.items.map((item: any, index: number) => ({
      ...QuoteEventsService.snapshotOf(item),
      quoteTraceId: item.quoteTraceId || `order-${order._id}-${index}`,
      type: QuoteEventType.PDF_DOWNLOADED,
      userId: user.userId,
      customerId: item.core?.customerId ?? order.header.customerId,
      orderId: String(order._id),
      orderNumber: order.header.orderNumber,
      source: "order",
    }));
  }

  /** Completa el factoryId con el del usuario si el presupuesto no lo trae (sin él, el alcance de fábrica no lo ve). */
  async fillFactoryIds(events: QuoteEventInput[]): Promise<void> {
    const missingFactory = [...new Set(events.filter((e) => !e.factoryId && e.userId && Types.ObjectId.isValid(e.userId)).map((e) => String(e.userId)))];
    if (!missingFactory.length) return;
    const users = await this.userModel.find({ _id: { $in: missingFactory } }).select("factoryId").lean();
    const factoryByUser = new Map(users.map((u) => [u._id.toString(), u.factoryId ? String(u.factoryId) : undefined]));
    events.forEach((e) => {
      if (!e.factoryId && e.userId) e.factoryId = factoryByUser.get(String(e.userId));
    });
  }

  /** Inserta en una sola petición. */
  private async persist(events: QuoteEventInput[]): Promise<void> {
    const valid = events.filter((e) => e.quoteTraceId);
    if (!valid.length) return;
    await this.fillFactoryIds(valid);
    await this.quoteEventModel.insertMany(valid);
  }
}
