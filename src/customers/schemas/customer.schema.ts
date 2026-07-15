import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { CustomerType } from "../enums/customer-type.enum";

export type CustomerDocument = Customer & Document;

@Schema({ _id: false })
class Contact {
  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  website: string;

  @Prop({ type: [String] })
  socialMedia: string[];
}

@Schema({ _id: false })
class Address {
  @Prop()
  country: string;

  @Prop()
  fullName: string;

  @Prop()
  addressLine1: string;

  @Prop()
  addressLine2: string;

  @Prop()
  city: string;

  @Prop()
  region: string;

  @Prop()
  cp: string;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: String, required: true, enum: CustomerType })
  type: CustomerType;

  @Prop()
  officialName: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  commercialName: string;

  @Prop()
  description: string;

  @Prop()
  nif: string;

  @Prop()
  birthDate: Date;

  @Prop()
  gender: string;

  @Prop()
  legalRepresentative: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory", required: true })
  factoryId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  platformUserId: string;

  @Prop()
  discountProfile: number;

  @Prop()
  taxProfile: number;

  @Prop({ type: Contact, default: {} })
  contact: Contact;

  @Prop({ type: Address, default: {} })
  address: Address;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: "User", default: [] })
  assignedUserIds: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  createdBy: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Pre-save hook to generate officialName for individuals if not provided
CustomerSchema.pre("save", function (next) {
  if (this.type === CustomerType.INDIVIDUAL && !this.officialName) {
    if (this.firstName || this.lastName) {
      this.officialName = `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }
  }
  next();
});
