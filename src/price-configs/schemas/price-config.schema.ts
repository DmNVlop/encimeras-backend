// src/price-configs/schemas/price-config.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PriceConfigDocument = PriceConfig & Document;

@Schema({ timestamps: true, versionKey: false })
export class PriceConfig {
    @Prop({ required: true, unique: true, trim: true })
    combinationKey: string;

    @Prop({ required: true })
    pricePerSquareMeter: number;
}

export const PriceConfigSchema = SchemaFactory.createForClass(PriceConfig);