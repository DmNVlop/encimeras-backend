// src/cutouts/schemas/cutout.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CutoutDocument = Cutout & Document;

@Schema({ timestamps: true, versionKey: false })
export class Cutout {
    @Prop({ required: true, unique: true, trim: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    type: string;
}

export const CutoutSchema = SchemaFactory.createForClass(Cutout);
