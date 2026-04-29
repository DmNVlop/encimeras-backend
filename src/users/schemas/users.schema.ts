import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { Role } from "../../auth/enums/role.enum";

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory" })
  factoryId?: string;

  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  ownerId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  managerId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  createdBy: string;
}

export const UsersSchema = SchemaFactory.createForClass(User);
