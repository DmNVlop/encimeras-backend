import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class GlobalSettings extends Document {
  @Prop({ required: true, unique: true, default: "config" })
  key: string; // Singleton key, ej: "default_config"

  @Prop({ required: true, default: 7 })
  draftValidityDays: number; // Configurable desde el Admin

  @Prop({ default: 1.0 })
  currentCurrencyMultiplier: number; // Para conversiones futuras Puntos -> Moneda
}

export const GlobalSettingsSchema = SchemaFactory.createForClass(GlobalSettings);
