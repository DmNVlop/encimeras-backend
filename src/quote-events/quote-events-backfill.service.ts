import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BACKFILL_SOURCE, QuoteEvent, QuoteEventType } from "./schemas/quote-event.schema";
import { Order } from "../orders/schemas/order.schema";
import { Draft } from "../drafts/schemas/draft.schema";
import { QuoteEventsService } from "./quote-events.service";

const BATCH_SIZE = 500;

export interface BackfillResult {
  dryRun: boolean;
  orderedEvents: number;
  draftSavedEvents: number;
  draftsTraced: number;
}

/**
 * Reconstruye la trazabilidad de datos anteriores a `quote_events` (solo ADMIN, repetible sin duplicar):
 * - ORDERED por cada ítem de orden sin ese evento (id del ítem o `order-<orderId>-<idx>`, el mismo que usan sus PDF).
 * - DRAFT_SAVED por cada borrador no convertido sin ese evento; los borradores sin id reciben `draft-<draftId>`
 *   (lo conservan al actualizarse). Los convertidos no se cuentan: su orden ya representa ese presupuesto.
 * Los eventos llevan la fecha original y `source: "backfill"`; no se reconstruyen cálculos ni descargas de PDF.
 */
@Injectable()
export class QuoteEventsBackfillService {
  private readonly logger = new Logger(QuoteEventsBackfillService.name);

  constructor(
    @InjectModel(QuoteEvent.name) private quoteEventModel: Model<QuoteEvent>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
    private quoteEventsService: QuoteEventsService,
  ) {}

  async run(adminUserId: string, dryRun: boolean): Promise<BackfillResult> {
    const orderedEvents = await this.backfillOrders(dryRun);
    const { events: draftSavedEvents, traced: draftsTraced } = await this.backfillDrafts(dryRun);
    const result = { dryRun, orderedEvents, draftSavedEvents, draftsTraced };
    this.logger.warn(`Backfill de trazabilidad por ADMIN ${adminUserId}: ${JSON.stringify(result)}`);
    return result;
  }

  private async backfillOrders(dryRun: boolean): Promise<number> {
    const existing = await this.tracedIds(QuoteEventType.ORDERED);
    let created = 0;
    let batch: any[] = [];

    for await (const order of this.orderModel.find().select("header items").lean().cursor()) {
      (order.items || []).forEach((item: any, index: number) => {
        const quoteTraceId = item.quoteTraceId || `order-${order._id}-${index}`;
        if (existing.has(quoteTraceId)) return;
        batch.push({
          ...QuoteEventsService.snapshotOf(item),
          quoteTraceId,
          type: QuoteEventType.ORDERED,
          userId: order.header.userId,
          customerId: item.core?.customerId ?? order.header.customerId,
          orderId: String(order._id),
          orderNumber: order.header.orderNumber,
          source: BACKFILL_SOURCE,
          createdAt: order.header.orderDate,
        });
      });
      if (batch.length >= BATCH_SIZE) {
        created += await this.insert(batch, dryRun);
        batch = [];
      }
    }
    return created + (await this.insert(batch, dryRun));
  }

  private async backfillDrafts(dryRun: boolean): Promise<{ events: number; traced: number }> {
    const existing = await this.tracedIds(QuoteEventType.DRAFT_SAVED);
    let events = 0;
    let traced = 0;
    let batch: any[] = [];
    let traceWrites: any[] = [];

    for await (const draft of this.draftModel.find({ isConverted: { $ne: true } }).select("-uiState -piecesBreakdown").lean().cursor()) {
      let quoteTraceId = draft.quoteTraceId;
      if (!quoteTraceId) {
        quoteTraceId = `draft-${draft._id}`;
        traceWrites.push({ updateOne: { filter: { _id: draft._id, quoteTraceId: null }, update: { $set: { quoteTraceId } } } });
      }
      if (!existing.has(quoteTraceId)) {
        batch.push({
          ...QuoteEventsService.snapshotOf(draft as any),
          quoteTraceId,
          type: QuoteEventType.DRAFT_SAVED,
          userId: draft.userId,
          draftId: String(draft._id),
          source: BACKFILL_SOURCE,
          createdAt: (draft as any).createdAt,
        });
      }
      if (batch.length >= BATCH_SIZE || traceWrites.length >= BATCH_SIZE) {
        events += await this.insert(batch, dryRun);
        traced += await this.writeTraceIds(traceWrites, dryRun);
        batch = [];
        traceWrites = [];
      }
    }
    events += await this.insert(batch, dryRun);
    traced += await this.writeTraceIds(traceWrites, dryRun);
    return { events, traced };
  }

  private async tracedIds(type: QuoteEventType): Promise<Set<string>> {
    return new Set(await this.quoteEventModel.distinct("quoteTraceId", { type }));
  }

  /** Inserción directa en la colección para conservar la fecha original (Mongoose pondría la actual). */
  private async insert(events: any[], dryRun: boolean): Promise<number> {
    await this.quoteEventsService.fillFactoryIds(events);
    const clean =events.map((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== null)));
    if (!dryRun && clean.length) await this.quoteEventModel.collection.insertMany(clean, { ordered: false });
    return clean.length;
  }

  private async writeTraceIds(writes: any[], dryRun: boolean): Promise<number> {
    if (dryRun || !writes.length) return writes.length;
    const { modifiedCount } = await this.draftModel.bulkWrite(writes);
    return modifiedCount;
  }
}
