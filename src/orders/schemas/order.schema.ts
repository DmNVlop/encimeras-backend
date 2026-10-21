import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { ORDER_STATUSES } from "../order-status-flow";

// Cambio de estado (append-only): quién, cuándo, de dónde a dónde y por qué. Nunca se edita ni se borra.
@Schema({ _id: false })
export class OrderStatusChange {
  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  by: string; // userId de quien hizo el cambio

  @Prop()
  byName?: string; // Snapshot del nombre en el momento del cambio

  @Prop({ type: [String], default: [] })
  byRoles: string[];

  @Prop({ required: true })
  at: Date;

  @Prop()
  note?: string;

  @Prop()
  undo?: boolean; // true = revierte el último cambio vigente
}

export const OrderStatusChangeSchema = SchemaFactory.createForClass(OrderStatusChange);

// 1. HEADER (Estandarizado para integración con ERP/CRM)
@Schema({ _id: false })
export class OrderHeader {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string; // Ej: ORD-2026-0001

  @Prop({ required: true, index: true })
  userId: string; // ID del creador de la orden (Vendedor o Usuario)

  @Prop({ required: true, index: true })
  orderName: string; // Nombre identificador del presupuesto (único por usuario)

  @Prop({ index: true })
  customerId?: string; // ID del cliente final B2B

  @Prop({ required: true, default: "PENDING", enum: [...ORDER_STATUSES] })
  status: string;

  @Prop({ type: [OrderStatusChangeSchema], default: [] })
  statusHistory: OrderStatusChange[]; // Órdenes anteriores a 2026-10-21 no lo tienen: su timeline arranca en el estado actual

  @Prop({ required: true })
  totalPoints: number; // Valor inmutable final

  @Prop({ required: true, default: 0 })
  totalOriginalPoints: number;

  @Prop({ required: true, default: 0 })
  totalDiscount: number;

  @Prop({ required: true })
  orderDate: Date;

  @Prop()
  deliveryDate?: Date;
}

// 2. DETALLE TÉCNICO (Snapshot inmutable de KUUK)
@Schema({ _id: false })
export class OrderLineItem {
  @Prop({ required: true, default: "COUNTERTOP_PROJECT" })
  type: string;

  @Prop({ required: true })
  cartItemName: string; // Ej: "Cocina de Juana", "Isla de Tomás"

  @Prop({ index: true })
  quoteTraceId?: string; // Id de trazabilidad del presupuesto de origen (draft → cart → order)

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  core: {
    mainPieces: any[];
    factoryId?: string;
    [key: string]: any;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  uiState?: Record<string, any>;

  @Prop({ required: true, default: 0 })
  originalPoints: number;

  @Prop({ required: true, default: 0 })
  discountAmount: number;

  @Prop({ required: true, default: 0 })
  subtotalPoints: number; // Precio final con descuento de ítem aplicado

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  appliedRules: any[]; // Reglas de descuento aplicadas a este ítem

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  piecesBreakdown: any[]; // Desglose inmutable de precios por pieza y addon
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: OrderHeader, required: true })
  header: OrderHeader;

  @Prop({ type: [OrderLineItem], required: true })
  items: OrderLineItem[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  appliedGlobalRules: any[]; // Reglas de descuento globales del carrito al momento del checkout

  // Referencia al borrador original (trazabilidad)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Draft" })
  originDraftId?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ "header.userId": 1, "header.orderName": 1 }, { unique: true });
// Bandeja paginada (GET /orders/search): alcance de fábrica / por estado, ordenado por fecha
OrderSchema.index({ "items.core.factoryId": 1, "header.status": 1, "header.orderDate": -1 });
OrderSchema.index({ "header.status": 1, "header.orderDate": -1 });
