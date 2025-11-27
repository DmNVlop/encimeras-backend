// src/price-configs/schemas/price-config.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type PriceConfigDocument = PriceConfig & Document;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class PriceConfig {
  @Prop({ required: true, trim: true })
  combinationKey: string; // e.g., 'MAT_GROUP:Basic||MAT_THICKNESS:20mm'

  // Enlace a la receta de precios del material (e.g., 'ENCIMERA', 'CLADDING').
  @Prop({ required: true, trim: true })
  productType: string;

  @Prop({ required: true })
  price: number; // Puntos
}

// Creamos el Schema a partir de la clase
export const PriceConfigSchema = SchemaFactory.createForClass(PriceConfig);

// Definimos el índice compuesto sobre el Schema ya creado
PriceConfigSchema.index({ productType: 1, combinationKey: 1 }, { unique: true });
