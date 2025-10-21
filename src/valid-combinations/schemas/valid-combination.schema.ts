// src/valid-combinations/schemas/valid-combination.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Material } from 'src/materials/schemas/material.schema';

export type ValidCombinationDocument = ValidCombination & Document;

@Schema({ timestamps: true, versionKey: false })
export class ValidCombination {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true })
    materialId: Material;

    @Prop({ type: mongoose.Schema.Types.Map, of: String, required: true })
    attributes: Record<string, string>;
}

export const ValidCombinationSchema = SchemaFactory.createForClass(ValidCombination);
