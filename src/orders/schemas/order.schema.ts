import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

// 1. HEADER (Estandarizado para integración con ERP/CRM)
@Schema({ _id: false })
export class OrderHeader {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string; // Ej: ORD-2026-0001

  @Prop({ required: true, index: true })
  customerId: string; // ID del usuario o referencia externa

  @Prop({ required: true, default: "PENDING", enum: ["PENDING", "MANUFACTURING", "SHIPPED", "INSTALLED", "CANCELLED"] })
  status: string;

  @Prop({ required: true })
  totalPoints: number; // Valor inmutable

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

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  technicalSnapshot: {
    // Copia profunda de lo que se va a fabricar.
    // Incluye layout 3D, materiales y cortes exactos.
    materials: any[];
    pieces: any[]; // MainPieces con medidas finales
    addons: any[]; // Accesorios aplicados
  };
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: OrderHeader, required: true })
  header: OrderHeader;

  @Prop({ type: [OrderLineItem], required: true })
  items: OrderLineItem[];

  // Referencia al borrador original (trazabilidad)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Draft" })
  originDraftId?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
