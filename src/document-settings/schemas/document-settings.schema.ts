import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type DocumentSettingsDocument = DocumentSettings & Document;

@Schema({ timestamps: true })
export class DocumentSettings {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory", required: true })
  factoryId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", default: null })
  userId: string | null;

  @Prop({ required: true, default: 30 })
  validityDays: number;

  @Prop({
    required: true,
    default:
      "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días.",
  })
  footerText: string;
}

export const DocumentSettingsSchema = SchemaFactory.createForClass(DocumentSettings);

DocumentSettingsSchema.index({ factoryId: 1, userId: 1 }, { unique: true });
