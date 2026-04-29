// src/quotes/schemas/quote.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { MainPiece } from "src/main-pieces/schemas/main-pieces.schema";

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true, versionKey: false })
export class Quote {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop()
  customerPhone?: string;

  @Prop({ enum: ["Pendiente", "Contactado", "Aceptado"], default: "Pendiente" })
  status: string;

  // LA FUENTE DE LA VERDAD: Array de referencias a MainPieces
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "MainPiece" }] })
  mainPieces: MainPiece[];

  // Totales calculados
  @Prop({ required: true })
  totalPrice: number; // Puntos Finales (tras descuentos)

  @Prop({ required: true, default: 0 })
  totalPriceBeforeDiscount: number;

  @Prop({ default: 0 })
  totalDiscount: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  createdBy?: string;

  @Prop({ type: Array, default: [] })
  appliedRules: Array<{ ruleId: string; ruleName: string; discountAmount: number }>;

  // Desglose guardado como objeto JSON para historial
  @Prop({ type: Array })
  priceBreakdown: Array<{
    description: string;
    points: number;
    discountAmount?: number;
    finalPoints?: number;
  }>;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
