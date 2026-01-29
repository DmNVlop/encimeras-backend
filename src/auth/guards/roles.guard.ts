import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "../enums/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Leemos los roles requeridos por el decorador @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // Si la ruta no tiene roles requeridos, dejamos pasar
    if (!requiredRoles) {
      return true;
    }

    // Obtenemos el usuario que insertó el JwtStrategy
    const { user } = context.switchToHttp().getRequest();

    // Lógica de Arrays:
    // Verificamos si user.roles tiene AL MENOS UNO de los requiredRoles
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
