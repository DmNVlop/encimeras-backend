import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class Draft extends Document {
  @Prop({ index: true })
  userId?: string; // Opcional (puede ser null si es invitado con sessionID)

  @Prop()
  userEmail?: string; // Para recuperación rápida

  // Guardamos la configuración completa del QuoteContext
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  configuration: {
    wizardTempMaterial: any; // [cite: 36]
    mainPieces: any[]; // [cite: 39]
    // Otros estados necesarios
  };

  @Prop({ required: true })
  currentPricePoints: number; // Precio calculado al momento de guardar

  @Prop({ required: true, index: true })
  expirationDate: Date; // Fecha límite de validez

  @Prop({ default: false })
  isConverted: boolean; // Si ya se convirtió en orden
}

export const DraftSchema = SchemaFactory.createForClass(Draft);
