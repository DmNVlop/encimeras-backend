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

  @Prop({ default: true })
  multiSalesPerCustomer: boolean; // true = varios SALES por cliente, false = uno solo
}

export const GlobalSettingsSchema = SchemaFactory.createForClass(GlobalSettings);
