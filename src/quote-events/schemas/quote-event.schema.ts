import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum QuoteEventType {
  CALCULATED = "CALCULATED",
  DRAFT_SAVED = "DRAFT_SAVED",
  CART_ADDED = "CART_ADDED",
  PDF_DOWNLOADED = "PDF_DOWNLOADED",
  ORDERED = "ORDERED",
}

/** `source` de los eventos reconstruidos desde datos anteriores a la trazabilidad (no miden cálculos ni PDF). */
export const BACKFILL_SOURCE = "backfill";

/**
 * Evento de trazabilidad de un presupuesto (append-only: nunca se edita ni se borra).
 * `quoteTraceId` une todos los eventos del mismo presupuesto a lo largo de draft → cart → order.
 */
@Schema({ collection: "quote_events", timestamps: { createdAt: true, updatedAt: false } })
export class QuoteEvent extends Document {
  @Prop({ required: true })
  quoteTraceId: string;

  @Prop({ required: true, enum: Object.values(QuoteEventType) })
  type: QuoteEventType;

  @Prop()
  userId?: string; // Quien dispara la acción

  @Prop()
  factoryId?: string;

  @Prop()
  customerId?: string;

  @Prop()
  draftId?: string;

  @Prop()
  cartItemId?: string;

  @Prop()
  orderId?: string;

  @Prop()
  orderNumber?: string;

  @Prop()
  source?: string; // Desde dónde se dispara (p. ej. PDF de "cart" u "order")

  // Snapshot del precio en el momento del evento
  @Prop()
  totalPoints?: number;

  @Prop()
  originalPoints?: number;

  @Prop()
  discountAmount?: number;

  @Prop()
  piecesCount?: number;

  createdAt: Date;
}

export const QuoteEventSchema = SchemaFactory.createForClass(QuoteEvent);

QuoteEventSchema.index({ quoteTraceId: 1, createdAt: 1 });
QuoteEventSchema.index({ factoryId: 1, createdAt: -1 });
QuoteEventSchema.index({ userId: 1, createdAt: -1 });
QuoteEventSchema.index({ customerId: 1, createdAt: -1 });
