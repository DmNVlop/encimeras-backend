import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Role } from "../enums/role.enum";

@Injectable()
export class FactoryScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.roles.includes(Role.ADMIN)) {
      return true;
    }

    if ([Role.OWNER, Role.SALES, Role.WORKER].some((r) => user.roles.includes(r))) {
      if (!user.factoryId) {
        throw new ForbiddenException("User does not have a factory assigned");
      }
    }

    return true;
  }
}
