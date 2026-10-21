import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User } from "../../users/schemas/users.schema";
import { Customer } from "../../customers/schemas/customer.schema";

export interface DisplayName {
  name: string;
  email?: string;
}

const validIds = (ids: (string | null | undefined)[]) => [...new Set(ids.filter((id) => id && Types.ObjectId.isValid(id)).map(String))];

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Nombres legibles de usuarios y clientes para respuestas hidratadas (BFF). Fuente única:
 * la usan analytics (actividad, portal) y orders (bandeja del backoffice).
 */
@Injectable()
export class DisplayNamesService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) {}

  async userNames(ids: (string | null | undefined)[]): Promise<Map<string, DisplayName>> {
    const valid = validIds(ids);
    if (!valid.length) return new Map();
    const users = await this.userModel.find({ _id: { $in: valid } }).select("name username email").lean();
    return new Map(users.map((u: any) => [u._id.toString(), { name: u.name || u.username || "Usuario sin nombre", email: u.email }]));
  }

  /** Solo clientes reales: ids que no son de un Customer (p. ej. userIds en drafts antiguos) no aparecen en el mapa. */
  async customerNames(ids: (string | null | undefined)[]): Promise<Map<string, DisplayName>> {
    const valid = validIds(ids);
    if (!valid.length) return new Map();
    const customers = await this.customerModel
      .find({ _id: { $in: valid } })
      .select("commercialName officialName firstName lastName contact.email")
      .lean();
    return new Map(customers.map((c: any) => [c._id.toString(), { name: DisplayNamesService.customerName(c), email: c.contact?.email }]));
  }

  /** Ids de usuarios y clientes cuyo nombre/email contiene `text` (búsqueda libre de listados). Acotado a `limit` por colección. */
  async findIdsByName(text: string, limit = 200): Promise<{ userIds: string[]; customerIds: string[] }> {
    const rx = new RegExp(escapeRegex(text.trim()), "i");
    const [users, customers] = await Promise.all([
      this.userModel.find({ $or: [{ name: rx }, { username: rx }, { email: rx }] }).select("_id").limit(limit).lean(),
      this.customerModel
        .find({ $or: [{ commercialName: rx }, { officialName: rx }, { firstName: rx }, { lastName: rx }, { "contact.email": rx }, { nif: rx }] })
        .select("_id")
        .limit(limit)
        .lean(),
    ]);
    return { userIds: users.map((u) => u._id.toString()), customerIds: customers.map((c) => c._id.toString()) };
  }

  static customerName(c: any): string {
    return c.commercialName || c.officialName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.contact?.email || "Cliente sin nombre";
  }

  static escapeRegex = escapeRegex;
}
