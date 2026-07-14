import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { CollisionStrategy, CustomerStrategy, DiscountScope, DiscountType } from "../enums/discount-rule.enums";

export type DiscountRuleDocument = DiscountRule & Document;

@Schema({ _id: false })
class DiscountConditions {
  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ type: String, enum: CustomerStrategy, default: CustomerStrategy.ALL })
  customerStrategy: CustomerStrategy;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "Customer" }] })
  targetCustomers: string[];

  @Prop()
  minOrderValue: number;
}

@Schema({ timestamps: true })
export class DiscountRule {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: DiscountType })
  type: DiscountType;

  @Prop({ required: true })
  value: number;

  @Prop({ type: String, required: true, enum: DiscountScope })
  scope: DiscountScope;

  @Prop({ type: [String] })
  targetMaterials: string[];

  @Prop({ type: [String] })
  targetCategories: string[];

  @Prop({ default: 0 })
  priority: number;

  @Prop({ type: String, enum: CollisionStrategy, default: CollisionStrategy.SUM })
  collisionStrategy: CollisionStrategy;

  @Prop({ default: true })
  stackable: boolean;

  @Prop({ type: DiscountConditions })
  conditions: DiscountConditions;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory", required: true })
  factoryId: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DiscountRuleSchema = SchemaFactory.createForClass(DiscountRule);
