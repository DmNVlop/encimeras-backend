import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";
import { MeasurementRuleSet } from "src/measurement-rule-sets/schemas/measurement-rule-sets.schema";

export type AddonDocument = Addon & mongoose.Document;

@Schema({ timestamps: true })
export class Addon {
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  // --- NUEVO: Categorización Visual para el Frontend ---
  @Prop({
    required: true,
    enum: ["TRABAJO", "ENSAMBLAJE", "COMPLEMENTO", "OTRO"],
    default: "OTRO",
  })
  category: string;

  // --- NUEVO: Filtro de Compatibilidad ---
  // Ej: ['HPL', 'COMPACTO'] o ['*'] para todos
  @Prop({ type: [String], required: true, default: [] })
  allowedMaterialCategories: string[];

  // --- NUEVO: Configuración de Inputs del Frontend ---
  // Ej: ['length_ml'] o ['quantity', 'width_mm']
  @Prop({
    type: [String],
    required: true,
    enum: ["quantity", "length_ml", "width_mm", "height_mm", "radio_mm"],
    default: ["quantity"],
  })
  requiredMeasurements: string[];

  @Prop({ required: false })
  imageUrl?: string;

  @Prop({ required: false })
  description?: string;

  // --- LÓGICA DE PRECIOS (EXISTENTE) ---
  @Prop({
    required: true,
    enum: ["COMBINATION_BASED", "RANGE_BASED", "FIXED"],
  })
  pricingType: "COMBINATION_BASED" | "RANGE_BASED" | "FIXED";

  @Prop({ required: true, trim: true })
  productTypeMap: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "MeasurementRuleSet",
    required: false,
  })
  measurementRuleSetId?: MeasurementRuleSet;

  @Prop({ type: [String], required: false })
  inheritedAttributes?: string[];
}

export const AddonSchema = SchemaFactory.createForClass(Addon);
