// src/quotes/schemas/quote.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Material } from '../../materials/schemas/material.schema';
import { EdgeProfile } from '../../edge-profiles/schemas/edge-profile.schema';
import { Cutout } from '../../cutouts/schemas/cutout.schema';

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true, versionKey: false })
export class Quote {
    @Prop({ required: true })
    customerName: string;

    @Prop({ required: true })
    customerEmail: string;

    @Prop()
    customerPhone?: string;

    @Prop({ enum: ['Pendiente', 'Contactado', 'Aceptado'], default: 'Pendiente' })
    status: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Material', required: true })
    material: Material;

    // @Prop({ required: true })
    // thickness: number;

    // @Prop({ required: true })
    // finish: string;

    @Prop({ type: Object, required: true })
    priceAttributes: {
        type: string;
        attributes: Record<string, string>;
    };

    @Prop({ enum: ['Lineal', 'L', 'U'], required: true })
    shape: string;

    @Prop({ type: Object, required: true })
    measurements: Record<string, number>; // e.g., { ladoA: 250, fondo: 62 }

    @Prop()
    backsplashMeters?: number;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EdgeProfile' })
    edgeProfile: EdgeProfile;

    @Prop([{
        cutout: { type: MongooseSchema.Types.ObjectId, ref: 'Cutout' },
        quantity: Number
    }])
    cutouts: { cutout: Cutout; quantity: number }[];

    @Prop({ type: Object })
    priceBreakdown: Record<string, number>;

    @Prop({ required: true })
    totalPrice: number;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
