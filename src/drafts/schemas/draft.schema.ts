import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class Draft extends Document {
  @Prop({ index: true })
  userId?: string; // Opcional (puede ser null si es invitado con sessionID)

  @Prop()
  userEmail?: string; // Para recuperación rápida

  @Prop({ required: false })
  name?: string; // Nombre personalizado del borrador

  // Datos estrictos de negocio
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  core: {
    mainPieces: any[];
    factoryId?: string;
    [key: string]: any;
  };

  // Metadatos de UI
  @Prop({ type: MongooseSchema.Types.Mixed })
  uiState?: Record<string, any>;

  @Prop({ required: true })
  currentPricePoints: number; // Precio con descuento

  @Prop({ required: true, default: 0 })
  originalPoints: number;

  @Prop({ required: true, default: 0 })
  discountAmount: number;

  @Prop({ required: true, index: true })
  expirationDate: Date; // Fecha límite de validez

  @Prop({ default: false })
  isConverted: boolean; // Si ya se convirtió en orden

  @Prop({ index: true })
  cartGroupId?: string; // ID de agrupación para múltiples presupuestos en un carrito
}

export const DraftSchema = SchemaFactory.createForClass(Draft);
