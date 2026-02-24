import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  cartItemId: string;

  @Prop({ required: true })
  customName: string; // Ej: "Cocina de Juana"

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  technicalSnapshot: {
    wizardTempMaterial?: any;
    selectedShapeId?: string;
    mainPieces?: any[];
    materials?: any[];
    addons?: any[];
  };

  @Prop({ required: true })
  subtotalPoints: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Draft" })
  draftId?: string;
}

export type CartDocument = Cart & Document;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true, index: true })
  customerId: string; // ID de usuario o SessionID

  @Prop({ required: true, default: "ACTIVE", enum: ["ACTIVE", "CONVERTED", "ABANDONED"] })
  status: string;

  @Prop({ required: true, default: 0 })
  totalPoints: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
