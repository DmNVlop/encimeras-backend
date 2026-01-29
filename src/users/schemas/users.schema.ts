import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Role } from "../../auth/enums/role.enum";

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string; // O email, lo que prefieras usar para login

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop()
  name?: string; // Nombre real para mostrar en el UI

  @Prop()
  email?: string; // Útil para notificaciones

  @Prop()
  phone?: string; // Teléfono para mostrar en el UI
}

export const UsersSchema = SchemaFactory.createForClass(User);
