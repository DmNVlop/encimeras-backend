// src/edge-profiles/schemas/edge-profile.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EdgeProfileDocument = EdgeProfile & Document;

@Schema({ timestamps: true, versionKey: false })
export class EdgeProfile {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  pricePerMeter: number;

  @Prop()
  imageUrl: string;
}

export const EdgeProfileSchema = SchemaFactory.createForClass(EdgeProfile);
