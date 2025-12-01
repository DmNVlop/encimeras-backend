import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";
import { Material } from "src/materials/schemas/material.schema";
import { Quote } from "src/quotes/schemas/quote.schema";

// --- Subdocumento para los Accesorios Aplicados a una Pieza ---
// Representa la instancia de un accesorio (e.g., 'Aplacado' o 'Copete')
// con sus medidas específicas para esta pieza.
@Schema({ _id: false })
export class AppliedAddon {
  @Prop({ required: true, trim: true })
  code: string; // e.g., 'CLADDING', 'COVING_ML'

  // Objeto flexible para guardar las medidas del accesorio
  // e.g., { length_ml: 2.5, height_mm: 600 } para un Aplacado
  // e.g., { length_ml: 2.5, width_mm: 75 } para un Copete
  @Prop({ type: Object, default: {} })
  measurements: Record<string, number>;

  @Prop({ default: 1 })
  quantity: number; // Útil para accesorios como 'Costado Visto'
}
const AppliedAddonSchema = SchemaFactory.createForClass(AppliedAddon);

// --- Documento Principal: La Pieza Principal ---
@Schema({ timestamps: true })
export class MainPiece {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Quote" })
  quoteId: Quote;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true,
  })
  materialId: Material;

  // Guarda la selección completa del usuario para esta pieza.
  // e.g., { MAT_GROUP: 'Basic', MAT_THICKNESS: '20mm', ... }
  @Prop({ type: Object, required: true })
  selectedAttributes: Record<string, string>;

  @Prop({ required: true })
  length_mm: number;

  @Prop({ required: true })
  width_mm: number;

  @Prop({ type: [AppliedAddonSchema], default: [] })
  appliedAddons: AppliedAddon[];
}

export type MainPieceDocument = MainPiece & mongoose.Document;
export const MainPieceSchema = SchemaFactory.createForClass(MainPiece);
