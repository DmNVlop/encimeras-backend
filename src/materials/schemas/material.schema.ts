// src/materials/schemas/material.schema.ts

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type MaterialDocument = Material & Document;

// --- Subdocumento para las Recetas de Precios ---
// Define cómo se calcula el precio para un tipo de producto específico
// fabricado con este material (e.g., Encimera, Aplacado).
@Schema({ _id: false })
export class PricingRecipe {
  @Prop({ required: true, trim: true })
  productType: string; // 'ENCIMERA', 'CLADDING', 'DECORATION'

  @Prop({ type: [String], required: true })
  pricingAttributes: string[]; // La "receta" de atributos para ESTE producto

  @Prop({ required: true, default: "m2", enum: ["m2", "ml"] })
  unit: "m2" | "ml"; // Cómo se cobra este producto (metros cuadrados o lineales)
}
const PricingRecipeSchema = SchemaFactory.createForClass(PricingRecipe);

@Schema({ timestamps: true, versionKey: false })
export class Material {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  ref: string;

  @Prop()
  imageUrl: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [PricingRecipeSchema], default: [] })
  pricingRecipes: PricingRecipe[];

  @Prop({ type: [String], required: false, default: [] })
  selectableAttributes: string[]; // <-- Para el STEP 1
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
