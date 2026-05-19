import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  cartItemId: string;

  @Prop({ required: true })
  customName: string; // Ej: "Cocina de Juana"

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  core: {
    mainPieces: any[];
    factoryId?: string;
    [key: string]: any;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  uiState?: Record<string, any>;

  @Prop({ required: true })
  subtotalPoints: number;

  @Prop({ required: true, default: 0 })
  originalPoints: number;

  @Prop({ required: true, default: 0 })
  discountAmount: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  appliedRules: any[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Draft" })
  draftId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  piecesBreakdown: any[]; // Desglose de precios por pieza y addon (se recalcula en cada cambio)

  /**
   * Este campo NO se guarda en la DB.
   * Se llena dinámicamente en el Service (patrón BFF) para enviar al Front
   * información actualizada (nombres de materiales, precios actuales, etc.)
   */
  @Prop({ type: MongooseSchema.Types.Mixed })
  hydratedContext?: Record<string, any>;
}

export type CartDocument = Cart & Document;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true, index: true })
  userId: string; // ID de usuario o SessionID

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Customer", index: true })
  customerId?: string;

  @Prop({ required: true, default: "ACTIVE", enum: ["ACTIVE", "CONVERTED", "ABANDONED"] })
  status: string;

  @Prop({ required: true, default: 0 })
  totalPoints: number; // Este será el Total Neto (Final)

  @Prop({ required: true, default: 0 })
  totalOriginalPoints: number; // Este será el Total Bruto

  @Prop({ required: true, default: 0 })
  totalDiscount: number; // Suma de todos los descuentos (ítems + globales)

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  appliedGlobalRules: any[];

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
