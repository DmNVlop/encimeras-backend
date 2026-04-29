import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Role } from "../enums/role.enum";

// Roles que operan dentro de una fábrica y deben tener factoryId asignado
const FACTORY_SCOPED_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.SALES, Role.WORKER];

@Injectable()
export class FactoryScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.roles.includes(Role.ADMIN)) return true;

    if (FACTORY_SCOPED_ROLES.some((r) => user.roles.includes(r))) {
      if (!user.factoryId) {
        throw new ForbiddenException("User does not have a factory assigned");
      }
    }

    return true;
  }
}
