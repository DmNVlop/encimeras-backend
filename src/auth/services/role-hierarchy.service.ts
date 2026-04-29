import { Injectable } from "@nestjs/common";
import { Role, ROLE_HIERARCHY, getMaxRoleLevel, hasMinimumLevel } from "../enums/role.enum";

@Injectable()
export class RoleHierarchyService {
  /**
   * True si `userRoles` cumple o supera el nivel de AL MENOS UNO de `requiredRoles`.
   * Lógica: OR semántico — basta con que el usuario iguale o supere el rol menos exigente
   * de la lista requerida.
   *
   * Ejemplo: @Roles(Role.OWNER, Role.MANAGER) → accede cualquiera con nivel >= MANAGER (3).
   */
  canAccess(userRoles: Role[], requiredRoles: Role[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    // El mínimo nivel requerido = el rol menos exigente de la lista
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 0));
    return getMaxRoleLevel(userRoles) >= minRequired;
  }

  /** True si el usuario es estrictamente superior al rol dado. */
  isAbove(userRoles: Role[], role: Role): boolean {
    return getMaxRoleLevel(userRoles) > (ROLE_HIERARCHY[role] ?? 0);
  }

  /** True si el usuario tiene exactamente este nivel o superior. */
  isAtLeast(userRoles: Role[], role: Role): boolean {
    return hasMinimumLevel(userRoles, role);
  }

  /** True si el usuario tiene el rol exacto (sin escalado jerárquico). */
  hasExactRole(userRoles: Role[], role: Role): boolean {
    return userRoles.includes(role);
  }

  /** Nivel numérico máximo del usuario. */
  getLevel(userRoles: Role[]): number {
    return getMaxRoleLevel(userRoles);
  }

  /**
   * Valida que el creador tenga jerarquía suficiente para asignar los roles dados.
   * Un usuario solo puede asignar roles de nivel estrictamente inferior al suyo.
   * ADMIN (5) puede asignar OWNER (4) y menores.
   * OWNER (4) puede asignar MANAGER (3) y menores.
   */
  canAssignRoles(creatorRoles: Role[], rolesToAssign: Role[]): boolean {
    const creatorLevel = getMaxRoleLevel(creatorRoles);
    return rolesToAssign.every((r) => (ROLE_HIERARCHY[r] ?? 0) < creatorLevel);
  }
}
