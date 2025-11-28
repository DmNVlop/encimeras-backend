import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type MeasurementRuleSetDocument = MeasurementRuleSet & Document;

// --- Subdocumento para los rangos de medida ---
// No es una colección separada, vive dentro de MeasurementRuleSet
@Schema({ _id: false })
export class MeasurementRange {
  @Prop({ required: true, trim: true })
  label: string; // e.g., 'ESTANDAR_50', 'RANGO_51_100'

  @Prop({ required: true })
  min: number; // e.g., 0, 51

  @Prop({ required: true })
  max: number; // e.g., 50, 100. Usaremos Infinity para el última pieza.

  @Prop({ required: true, enum: ["ml", "m2", "piece"] })
  priceType: "ml" | "m2" | "piece";
}
const MeasurementRangeSchema = SchemaFactory.createForClass(MeasurementRange);

// --- Documento Principal ---
@Schema({ timestamps: true })
export class MeasurementRuleSet {
  @Prop({ required: true, unique: true, trim: true })
  name: string; // e.g., 'Reglas Ancho Copete HPL/ML'

  @Prop({ required: true, default: "mm" })
  unit: string; // e.g., 'mm'

  @Prop({ type: [MeasurementRangeSchema], default: [] })
  ranges: MeasurementRange[];
}

export const MeasurementRuleSetSchema = SchemaFactory.createForClass(MeasurementRuleSet);
