import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { MeasurementRuleSet } from 'src/measurement-rule-sets/schemas/measurement-rule-sets.schema';

export type AddonDocument = Addon & mongoose.Document;

@Schema({ timestamps: true })
export class Addon {
    @Prop({ required: true, unique: true, trim: true })
    code: string; // e.g., 'CLADDING', 'COVING_ML', 'SIDE_PANEL'

    @Prop({ required: true, trim: true })
    name: string; // e.g., 'Aplacado', 'Copete ML', 'Costado Visto'

    // El "cerebro" que determina el método de cálculo
    @Prop({
        required: true,
        enum: ['COMBINATION_BASED', 'RANGE_BASED', 'FIXED'],
    })
    pricingType: 'COMBINATION_BASED' | 'RANGE_BASED' | 'FIXED';

    // El "enlace" al tipo de producto en price-configs y materials
    @Prop({ required: true, trim: true })
    productTypeMap: string; // e.g., 'CLADDING', 'COVING_ML_RANGE', 'SIDE_PANEL_FIXED'

    // --- CAMPOS CONDICIONALES --- //
    // Estos campos solo son relevantes para ciertos pricingType

    // Para pricingType: 'RANGE_BASED' (e.g., Copete)
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MeasurementRuleSet',
        required: false,
    })
    measurementRuleSetId?: MeasurementRuleSet;

    // Para pricingType: 'RANGE_BASED' (e.g., Copete), para heredar MAT_GROUP
    @Prop({ type: [String], required: false })
    inheritedAttributes?: string[];
}

export const AddonSchema = SchemaFactory.createForClass(Addon);
