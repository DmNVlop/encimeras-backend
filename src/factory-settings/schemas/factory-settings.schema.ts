import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type FactorySettingsDocument = FactorySettings & Document;

@Schema({ timestamps: true })
export class FactorySettings {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory", required: true, unique: true })
  factoryId: string;

  @Prop({ type: String, default: null })
  logoUrl: string | null;

  // Filename guardado para poder borrar el archivo anterior sin dejar huérfanos
  @Prop({ type: String, default: null })
  logoFilename: string | null;

  // true = varios usuarios (SALES o MANAGER) por cliente, false = solo uno
  @Prop({ type: Boolean, default: true })
  multiAssignedUsersPerCustomer: boolean;
}


export const FactorySettingsSchema = SchemaFactory.createForClass(FactorySettings);
