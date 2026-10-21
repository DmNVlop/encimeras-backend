import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User } from "../../users/schemas/users.schema";
import { Customer } from "../../customers/schemas/customer.schema";
import { UsersService } from "../../users/users.service";
import { Role } from "../../auth/enums/role.enum";

/** Datos mínimos del usuario autenticado (req.user) que decide el alcance. */
export interface ScopeUser {
  userId: string;
  roles: Role[];
  factoryId?: string | null;
}

/**
 * Alcance de datos resuelto para un usuario. Política única ("quién ve qué"):
 * - ADMIN: todo.
 * - OWNER / WORKER con fábrica: toda su fábrica.
 * - MANAGER: él + sus SALES + los clientes asignados a cualquiera de ellos.
 * - SALES: él + sus clientes asignados (Customer.assignedUserIds) y sus cuentas de plataforma.
 * - USER (o rol de fábrica sin factoryId): solo lo suyo.
 */
export type DataScope =
  | { kind: "all" }
  | { kind: "factory"; factoryId: string }
  | { kind: "users"; userIds: string[]; customerIds: string[] };

@Injectable()
export class DataScopeService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    private usersService: UsersService,
  ) {}

  async resolve(user: ScopeUser): Promise<DataScope> {
    const roles = user.roles ?? [];
    if (roles.includes(Role.ADMIN)) return { kind: "all" };

    if ((roles.includes(Role.OWNER) || roles.includes(Role.WORKER)) && user.factoryId) {
      return { kind: "factory", factoryId: String(user.factoryId) };
    }

    if (roles.includes(Role.MANAGER) || roles.includes(Role.SALES)) {
      const userIds = [user.userId];
      if (roles.includes(Role.MANAGER)) {
        const salesUsers = await this.usersService.findManagedByManager(user.userId);
        userIds.push(...salesUsers.map((u) => (u as any)._id.toString()));
      }

      const customers = await this.customerModel
        .find({ assignedUserIds: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id platformUserId")
        .lean();
      const customerIds = customers.map((c) => c._id.toString());
      const platformUserIds = customers.filter((c) => c.platformUserId).map((c) => String(c.platformUserId));

      return { kind: "users", userIds: [...new Set([...userIds, ...platformUserIds])], customerIds };
    }

    return { kind: "users", userIds: [user.userId], customerIds: [] };
  }

  /** Filtro sobre la colección `orders` (factoryId vive en items.core.factoryId, invariante 1 Order = 1 fábrica). */
  toOrderFilter(scope: DataScope): Record<string, any> {
    if (scope.kind === "all") return {};
    if (scope.kind === "factory") return { "items.core.factoryId": scope.factoryId };

    const or: Record<string, any>[] = [{ "header.userId": { $in: scope.userIds } }];
    if (scope.customerIds.length) or.push({ "header.customerId": { $in: scope.customerIds } });
    return { $or: or };
  }

  /**
   * Filtro sobre la colección `drafts`. `core.factoryId` no está garantizado en drafts,
   * así que en alcance de fábrica también entran los drafts de los usuarios de esa fábrica.
   */
  async toDraftFilter(scope: DataScope): Promise<Record<string, any>> {
    if (scope.kind === "all") return {};
    if (scope.kind === "factory") {
      const factoryUserIds = await this.findFactoryUserIds(scope.factoryId);
      return { $or: [{ "core.factoryId": scope.factoryId }, { userId: { $in: factoryUserIds } }] };
    }

    const or: Record<string, any>[] = [{ userId: { $in: scope.userIds } }];
    if (scope.customerIds.length) or.push({ "core.customerId": { $in: scope.customerIds } });
    return { $or: or };
  }

  /** Filtro sobre la colección `quotes` (solo tienen `createdBy`, ObjectId). */
  async toQuoteFilter(scope: DataScope): Promise<Record<string, any>> {
    if (scope.kind === "all") return {};
    const ids = scope.kind === "factory" ? await this.findFactoryUserIds(scope.factoryId) : scope.userIds;
    return { createdBy: { $in: ids.map((id) => new Types.ObjectId(id)) } };
  }

  /** Filtro sobre la colección `quote_events` (cada evento guarda userId, factoryId y customerId). */
  toQuoteEventFilter(scope: DataScope): Record<string, any> {
    if (scope.kind === "all") return {};
    if (scope.kind === "factory") return { factoryId: scope.factoryId };

    const or: Record<string, any>[] = [{ userId: { $in: scope.userIds } }];
    if (scope.customerIds.length) or.push({ customerId: { $in: scope.customerIds } });
    return { $or: or };
  }

  /**
   * Salas de Socket.io a las que se une un usuario según su alcance. Todos entran en `user:<id>`
   * (eventos propios: checkout terminado o fallido); además `admin` o `factory:<id>`.
   */
  roomsFor(scope: DataScope, userId: string): string[] {
    const rooms = [`user:${userId}`];
    if (scope.kind === "all") rooms.push("admin");
    if (scope.kind === "factory") rooms.push(`factory:${scope.factoryId}`);
    return rooms;
  }

  /**
   * Inverso de `toOrderFilter`: salas de quienes pueden ver una orden concreta.
   * Creador, comerciales asignados al cliente (por `header.customerId` o por ser el creador
   * su cuenta de plataforma), los MANAGER de todos ellos, su fábrica y ADMIN.
   */
  async orderAudienceRooms(header: { userId: string; customerId?: string }, factoryId?: string): Promise<string[]> {
    const customerOr: Record<string, any>[] = [];
    if (header.customerId && Types.ObjectId.isValid(header.customerId)) customerOr.push({ _id: header.customerId });
    if (Types.ObjectId.isValid(header.userId)) customerOr.push({ platformUserId: header.userId });
    const customers = customerOr.length
      ? await this.customerModel.find({ $or: customerOr }).select("assignedUserIds").lean()
      : [];

    const userIds = new Set([String(header.userId), ...customers.flatMap((c) => (c.assignedUserIds || []).map(String))]);
    const validIds = [...userIds].filter((id) => Types.ObjectId.isValid(id));
    const managed = await this.userModel
      .find({ _id: { $in: validIds }, managerId: { $exists: true, $ne: null } })
      .select("managerId")
      .lean();
    managed.forEach((u) => userIds.add(String(u.managerId)));

    const rooms = ["admin", ...[...userIds].map((id) => `user:${id}`)];
    if (factoryId) rooms.push(`factory:${factoryId}`);
    return rooms;
  }

  private async findFactoryUserIds(factoryId: string): Promise<string[]> {
    const users = await this.userModel.find({ factoryId }).select("_id").lean();
    return users.map((u) => u._id.toString());
  }
}
