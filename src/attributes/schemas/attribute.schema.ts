// src/attributes/schemas/attribute.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttributeDocument = Attribute & Document;

@Schema({ timestamps: true, versionKey: false })
export class Attribute {
    @Prop({ required: true, trim: true, index: true })
    type: string;

    @Prop({ required: true, trim: true })
    value: string;

    @Prop({ trim: true })
    label: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const AttributeSchema = SchemaFactory.createForClass(Attribute);