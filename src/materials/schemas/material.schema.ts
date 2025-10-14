// src/materials/schemas/material.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MaterialDocument = Material & Document;

@Schema({ timestamps: true, versionKey: false })
export class Material {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ trim: true })
    description: string;

    @Prop()
    imageUrl: string;

    @Prop({ type: [String], required: true, default: [] })
    faces: string[]; // ej: ['1C', '2C']

    @Prop({ type: [String], required: true, default: [] })
    groups: string[]; // ej: ['Basic', 'Platinium']

    @Prop({ type: [Number], required: true })
    thicknesses: number[];

    @Prop({ type: [String], required: true })
    finishes: string[];

    @Prop({ required: true, trim: true })
    category: string;

    @Prop({ required: true, trim: true })
    type: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
